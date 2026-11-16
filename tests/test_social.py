"""Run with: python -m pytest tests  (or: python tests/test_social.py)"""
import os
import sys
import tempfile
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite:///" + os.path.join(tempfile.mkdtemp(), "social.db").replace(os.sep, "/")
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "server"))

from fastapi.testclient import TestClient  # noqa: E402
import main  # noqa: E402
import social  # noqa: E402

client = TestClient(main.app)
ALICE = {"author_id": "a" * 32, "author_name": "Alice"}
BOB = {"author_id": "b" * 32, "author_name": "Bob"}


def post(path, who, **extra):
    return client.post(f"/community/social/{path}", json={**who, **extra})


def test_friends_dm_and_channels():
    alice = post("sync", ALICE).json()["me"]["code"]
    bob = post("sync", BOB).json()["me"]["code"]
    assert alice != bob and len(alice) == 10
    assert "a" * 32 not in post("sync", BOB).text  # secret id never leaks

    # DMs are blocked until the request is accepted
    assert post("messages", ALICE, room=f"d:{bob}", text="hi").status_code == 403
    assert post("friends", ALICE, action="request", code=bob).json()["status"] == "pending"
    assert post("sync", BOB).json()["incoming"][0]["code"] == alice
    assert post("friends", BOB, action="accept", code=alice).json()["status"] == "accepted"

    assert post("messages", ALICE, room=f"d:{bob}", text="Tag 3 geschafft").status_code == 200
    synced = post("sync", BOB, room=f"d:{alice}").json()
    assert [m["text"] for m in synced["messages"]] == ["Tag 3 geschafft"]
    assert synced["friends"][0]["last_message_id"] == synced["messages"][0]["id"]

    # topic channel + incremental fetch
    first = post("messages", BOB, room="c:alcohol", text="Hallo").json()["message"]
    post("messages", ALICE, room="c:alcohol", text="Willkommen")
    later = post("sync", BOB, room="c:alcohol", after=first["id"]).json()["messages"]
    assert [m["text"] for m in later] == ["Willkommen"] and not later[0]["mine"]
    assert post("messages", BOB, room="c:unknown", text="x").status_code == 400

    # removing the friend closes the DM again
    post("friends", BOB, action="remove", code=alice)
    assert post("sync", ALICE).json()["friends"] == []
    assert post("messages", ALICE, room=f"d:{bob}", text="hi").status_code == 403

    assert post("friends", ALICE, action="request", code=alice).status_code == 400
    assert post("friends", ALICE, action="request", code="0123456789").status_code == 404


CARL = {"author_id": "e" * 32, "author_name": "Carl"}
DANA = {"author_id": "f" * 32, "author_name": "Dana"}
GIF = "R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="


def test_media_reactions_block_report():
    import base64
    bob = post("sync", BOB).json()["me"]["code"]
    alice = post("sync", ALICE).json()["me"]["code"]
    sent = post("messages", ALICE, room="c:general", text="schau www.example.com", media_type="image/gif", media_data=GIF).json()["message"]
    assert sent["media_type"] == "image/gif" and sent["has_link"] is True
    assert post("messages", ALICE, room="c:general", media_type="image/png", media_data=GIF).status_code == 400  # wrong signature
    assert base64.b64decode(GIF)[:3] == b"GIF"

    reacted = post("react", BOB, message_id=sent["id"], emoji="💪").json()["message"]
    assert reacted["reactions"] == {"💪": 1}
    assert post("react", BOB, message_id=sent["id"], emoji="🍺").status_code == 400

    assert post("report", BOB, code=alice, reason="spam", message_id=sent["id"]).json()["status"] == "reported"
    # blocking hides that person's channel messages and ends the friendship
    post("friends", ALICE, action="request", code=bob)
    post("friends", BOB, action="accept", code=alice)
    assert post("block", BOB, action="block", code=alice).json()["status"] == "blocked"
    synced = post("sync", BOB, room="c:general").json()
    assert all(m["sender_code"] != alice for m in synced["messages"])
    assert synced["friends"] == [] and synced["blocked"][0]["code"] == alice
    assert post("messages", ALICE, room=f"d:{bob}", text="hi").status_code == 403
    assert post("friends", ALICE, action="request", code=bob).status_code == 403
    post("block", BOB, action="unblock", code=alice)
    assert any(m["sender_code"] == alice for m in post("sync", BOB, room="c:general").json()["messages"])


def test_challenges():
    listed = post("challenges", ALICE).json()
    assert len(listed["challenges"]) >= 5 and not listed["challenges"][0]["joined"]
    assert post("challenges", ALICE, action="checkin", id="7-days").status_code == 400
    post("challenges", ALICE, action="join", id="7-days")
    done = post("challenges", ALICE, action="checkin", id="7-days").json()
    mine = next(c for c in done["challenges"] if c["id"] == "7-days")
    assert mine["joined"] and mine["my_days"] == 1 and mine["done_today"] and mine["participants"] == 1
    assert post("challenges", ALICE, action="checkin", id="7-days").json()["challenges"][0]["my_days"] == 1  # once a day
    assert done["feed"][0]["name"] == "Alice"


def test_help_flow():
    helper = {"helper_enabled": True, "helper_schedule": "", "tz_offset": 60}
    carl = post("sync", CARL, **helper).json()["me"]["code"]
    dana = post("sync", DANA, **helper).json()["me"]["code"]
    alice = post("sync", ALICE).json()["me"]["code"]

    request = post("help", ALICE, action="request", note="Mir geht's nicht gut").json()["help"]
    assert request["status"] == "offered"
    first = carl if post("sync", CARL).json()["help"] else dana
    second = dana if first == carl else carl
    first_who = CARL if first == carl else DANA
    second_who = DANA if first == carl else CARL
    offer = post("sync", first_who).json()["help"][0]
    assert offer["role"] == "helper" and "seeker_name" not in offer and offer["note"] == "Mir geht's nicht gut"

    # forwarding: request moves on, the first helper rests for an hour
    post("help", first_who, action="respond", id=request["id"], decision="forward")
    assert post("sync", first_who).json()["help"] == []
    assert post("sync", second_who).json()["help"][0]["status"] == "offered"
    status = post("help", ALICE, action="status", id=request["id"]).json()["help"]
    assert "beschäftigt" in " ".join(event["text"] for event in status["events"])

    accepted = post("help", second_who, action="respond", id=request["id"], decision="accept").json()["help"]
    assert accepted["status"] == "accepted" and accepted["room"] == f"h:{request['id']}"
    assert post("messages", ALICE, room=accepted["room"], text="Danke, dass du da bist").status_code == 200
    assert post("sync", second_who, room=accepted["room"]).json()["messages"][-1]["text"] == "Danke, dass du da bist"
    assert post("messages", BOB, room=accepted["room"], text="x").status_code == 403  # outsiders cannot read
    post("help", ALICE, action="end", id=request["id"])

    # a helper that does not answer in time is replaced automatically
    second_request = post("help", ALICE, action="request").json()["help"]
    db = main.SessionLocal()
    row = db.query(social.HelpRequestDB).get(second_request["id"])
    asked = row.helper
    row.offered_at -= social.OFFER_TIMEOUT + 1
    db.commit()
    db.close()
    after = post("help", ALICE, action="status", id=second_request["id"]).json()["help"]
    assert "Keine Antwort" in " ".join(event["text"] for event in after["events"])
    db = main.SessionLocal()
    assert db.query(social.HelpRequestDB).get(second_request["id"]).helper != asked
    db.close()


def _shift(request_id, **changes):
    db = main.SessionLocal()
    row = db.get(social.HelpRequestDB, request_id)
    for key, delta in changes.items():
        setattr(row, key, getattr(row, key) - delta)
    db.commit()
    db.close()


def test_crisis_chat_is_anonymous_timed_and_rated():
    helper = {"helper_enabled": True, "helper_schedule": "", "tz_offset": 60}
    erin = {"author_id": "1" * 32, "author_name": "Erin"}
    frank = {"author_id": "2" * 32, "author_name": "Frank"}
    erin_code = post("sync", erin, **helper).json()["me"]["code"]
    frank_code = post("sync", frank).json()["me"]["code"]
    # they are even friends – in the crisis chat they must still be unrecognisable
    post("friends", frank, action="request", code=erin_code)
    post("friends", erin, action="accept", code=frank_code)
    for who in (CARL, DANA):  # make sure only Erin can be matched
        post("sync", who, helper_enabled=False)

    request = post("help", frank, action="request").json()["help"]
    assert request["status"] == "offered"
    post("help", erin, action="respond", id=request["id"], decision="accept")
    room = f"h:{request['id']}"
    post("messages", frank, room=room, text="Ich will gerade trinken")
    seen = post("sync", erin, room=room).json()
    text = str(seen["messages"]) + str(seen["help"])  # the friends list may know Frank, the crisis chat must not
    assert "Frank" not in text and frank_code not in text
    assert seen["messages"][0]["sender_name"] == "Hilfesuchende Person"
    assert "Erin" not in str(post("help", frank, action="status", id=request["id"]).json())

    # after 5 minutes: both have to agree to continue
    _shift(request["id"], session_ends_at=301)
    deciding = post("help", frank, action="status", id=request["id"]).json()["help"]
    assert deciding["status"] == "deciding"
    assert post("messages", frank, room=room, text="hallo?").status_code == 403
    post("help", frank, action="vote", id=request["id"], decision="continue")
    again = post("help", erin, action="vote", id=request["id"], decision="continue").json()["help"]
    assert again["status"] == "accepted" and again["session_left"] > 290

    _shift(request["id"], session_ends_at=301)
    post("help", erin, action="status", id=request["id"])
    ended = post("help", erin, action="vote", id=request["id"], decision="stop").json()["help"]
    assert ended["status"] == "ended"

    # only the person who asked rates; it shows up on the helper's profile
    assert post("help", erin, action="feedback", id=request["id"], decision="helpful").json()["help"]["feedback_given"] is False  # helpers cannot rate
    rated = post("help", frank, action="feedback", id=request["id"], decision="helpful", report="other", block=True)
    assert rated.status_code == 200 and rated.json()["help"]["feedback_given"]
    assert post("help", frank, action="feedback", id=request["id"], decision="helpful").status_code == 409
    assert post("sync", erin).json()["me"]["helpful"] == 1
    # blocked helper is never matched to this person again
    assert post("help", frank, action="request").json()["help"]["status"] == "searching"


def test_faith_rooms_are_hidden_and_separate():
    assert post("sync", ALICE).json()["faith_channels"] == []
    both = post("sync", ALICE, faith="christian,islam").json()["faith_channels"]
    assert [channel["id"] for channel in both] == ["christian", "islam", "together"]
    only = [channel["id"] for channel in post("sync", BOB, faith="islam").json()["faith_channels"]]
    assert only == ["islam", "together"]
    assert post("messages", BOB, room="f:islam", text="Ramadan Mubarak").status_code == 403  # area not enabled
    assert post("messages", BOB, room="f:christian", text="x", faith="islam").status_code == 403
    sent = post("messages", BOB, room="f:islam", text="Ramadan Mubarak", faith="islam").json()["message"]
    assert post("sync", ALICE, room="f:islam", faith="christian,islam").json()["messages"][-1]["text"] == "Ramadan Mubarak"
    assert post("sync", ALICE, room="f:islam").status_code == 403
    assert post("react", ALICE, message_id=sent["id"], emoji="❤️").status_code == 403
    assert post("react", ALICE, message_id=sent["id"], emoji="❤️", faith="islam").status_code == 200
    assert "faith" not in str(post("sync", BOB).json()["me"])  # religion is never stored


def test_helper_can_choose_pause():
    helper = {"helper_enabled": True, "helper_schedule": "", "tz_offset": 60}
    gina = {"author_id": "3" * 32, "author_name": "Gina"}
    post("sync", gina, **helper)
    paused = post("help", gina, action="pause", pause_minutes=15).json()["paused_until"]
    import time
    assert 14 * 60 < paused - time.time() <= 15 * 60
    assert post("help", gina, action="pause", pause_minutes=0).json()["paused_until"] - time.time() <= 60  # at least 1 minute


def test_schedule():
    profile = social.CommunityProfileDB(helper_schedule='{"days": [0], "from": "22:00", "to": "02:00"}', tz_offset=0)
    monday_23 = 1700521200  # 2023-11-20 23:00 UTC, a Monday
    assert social._available_by_schedule(profile, monday_23)
    assert not social._available_by_schedule(profile, monday_23 - 6 * 3600)  # 17:00


if __name__ == "__main__":
    test_friends_dm_and_channels()
    test_media_reactions_block_report()
    test_challenges()
    test_help_flow()
    test_crisis_chat_is_anonymous_timed_and_rated()
    test_faith_rooms_are_hidden_and_separate()
    test_helper_can_choose_pause()
    test_schedule()
    print("ok")
