import base64
import binascii
import io
import queue
import threading
from datetime import datetime
from tkinter import filedialog

import customtkinter as ctk
import requests
from PIL import Image, ImageSequence

from stats import COMMUNITY_URL


MAX_IMAGE_SIZE = 500 * 1024
MAX_IMAGE_PIXELS = 16_000_000
CARD_BG = "#1C1C1E"
CARD_BORDER = "#38383A"
TEXT_SECONDARY = "#A1A1A6"
REACTIONS = ("❤️", "👍", "😂", "🔥", "🙌", "🎯")
STICKERS = ("💪", "🫂", "✨", "🎯", "🙌")


class CommunityForum(ctk.CTkFrame):
    def __init__(self, master, stats_manager, **kwargs):
        super().__init__(master, fg_color="transparent", **kwargs)
        self.stats_manager = stats_manager
        self.author_id, self.author_name = stats_manager.get_community_identity()
        self.selected_media = None
        self._images = []
        self._request_events = queue.Queue()
        self._build_ui()
        self.after(100, self._poll_request_events)
        self.refresh_posts()

    def _build_ui(self):
        header = ctk.CTkFrame(self, fg_color="transparent")
        header.pack(fill="x", padx=12, pady=(10, 4))
        ctk.CTkLabel(
            header,
            text="Community",
            font=ctk.CTkFont(size=25, weight="bold"),
            anchor="w",
        ).pack(side="left")
        ctk.CTkButton(
            header,
            text="Aktualisieren",
            width=130,
            height=38,
            command=self.refresh_posts,
        ).pack(side="right")

        ctk.CTkLabel(
            self,
            text="Teile Gedanken, Bilder oder GIFs und tausche dich mit der Community aus.",
            font=ctk.CTkFont(size=14),
            text_color=TEXT_SECONDARY,
            anchor="w",
        ).pack(fill="x", padx=14, pady=(0, 10))

        identity = ctk.CTkFrame(
            self,
            fg_color=CARD_BG,
            corner_radius=16,
            border_width=1,
            border_color=CARD_BORDER,
        )
        identity.pack(fill="x", padx=12, pady=(0, 10))
        ctk.CTkLabel(
            identity,
            text="Dein Anzeigename",
            font=ctk.CTkFont(size=14, weight="bold"),
        ).pack(side="left", padx=(14, 8), pady=12)
        self.name_entry = ctk.CTkEntry(
            identity,
            width=230,
            height=38,
            placeholder_text="Anzeigename",
        )
        self.name_entry.insert(0, self.author_name)
        self.name_entry.pack(side="left", padx=6, pady=10)
        ctk.CTkButton(
            identity,
            text="Name speichern",
            width=130,
            height=38,
            command=self.save_name,
        ).pack(side="left", padx=8, pady=10)
        ctk.CTkLabel(
            identity,
            text="Pseudonym · Beiträge sind öffentlich",
            font=ctk.CTkFont(size=12),
            text_color=TEXT_SECONDARY,
        ).pack(side="right", padx=14)

        composer = ctk.CTkFrame(
            self,
            fg_color=CARD_BG,
            corner_radius=16,
            border_width=1,
            border_color=CARD_BORDER,
        )
        composer.pack(fill="x", padx=12, pady=(0, 10))
        ctk.CTkLabel(
            composer,
            text="Neuer Beitrag",
            font=ctk.CTkFont(size=17, weight="bold"),
            anchor="w",
        ).pack(fill="x", padx=16, pady=(14, 6))
        self.post_text = ctk.CTkTextbox(
            composer,
            height=92,
            font=ctk.CTkFont(size=15),
            wrap="word",
        )
        self.post_text.pack(fill="x", padx=16, pady=(0, 8))

        tools = ctk.CTkFrame(composer, fg_color="transparent")
        tools.pack(fill="x", padx=16, pady=(0, 12))
        for sticker in STICKERS:
            ctk.CTkButton(
                tools,
                text=sticker,
                width=42,
                height=36,
                command=lambda value=sticker: self._insert_sticker(value),
            ).pack(side="left", padx=(0, 5))
        ctk.CTkButton(
            tools,
            text="Foto / GIF anhängen",
            width=155,
            height=36,
            command=self.select_media,
        ).pack(side="left", padx=6)
        self.media_status = ctk.CTkLabel(
            tools,
            text="",
            font=ctk.CTkFont(size=12),
            text_color=TEXT_SECONDARY,
        )
        self.media_status.pack(side="left", padx=6)
        ctk.CTkButton(
            tools,
            text="Posten",
            width=110,
            height=38,
            fg_color="#0A84FF",
            hover_color="#0066CC",
            command=self.create_post,
        ).pack(side="right")

        self.status_label = ctk.CTkLabel(
            self,
            text="",
            font=ctk.CTkFont(size=13),
            text_color=TEXT_SECONDARY,
            anchor="w",
        )
        self.status_label.pack(fill="x", padx=16, pady=(0, 4))
        self.feed = ctk.CTkScrollableFrame(self, fg_color="transparent")
        self.feed.pack(fill="both", expand=True, padx=6, pady=(0, 8))

    def _insert_sticker(self, sticker):
        self.post_text.insert("end", sticker)
        self.post_text.focus_set()

    def save_name(self):
        try:
            self.stats_manager.set_community_author_name(self.name_entry.get())
        except (OSError, TypeError, ValueError) as error:
            self._set_status(str(error), error=True)
            return
        self.author_id, self.author_name = self.stats_manager.get_community_identity()
        self.name_entry.delete(0, "end")
        self.name_entry.insert(0, self.author_name)
        self._set_status("Anzeigename gespeichert.")

    def select_media(self):
        path = filedialog.askopenfilename(
            parent=self,
            title="Foto oder GIF für die Community auswählen",
            filetypes=(("Bilder und GIFs", "*.png *.jpg *.jpeg *.gif"),),
        )
        if not path:
            return
        try:
            with Image.open(path) as image:
                image_format = image.format
                if image.width * image.height > MAX_IMAGE_PIXELS:
                    raise ValueError("Das Bild darf höchstens 16 Megapixel haben.")
                if image_format == "GIF":
                    frame = next(ImageSequence.Iterator(image))
                    frame.copy().load()
                else:
                    image.verify()
            with open(path, "rb") as media_file:
                media = media_file.read(MAX_IMAGE_SIZE + 1)
            if len(media) > MAX_IMAGE_SIZE:
                raise ValueError("Bilder und GIFs dürfen höchstens 500 KB groß sein.")
            media_type = {
                "PNG": "image/png",
                "JPEG": "image/jpeg",
                "GIF": "image/gif",
            }.get(image_format)
            if media_type is None:
                raise ValueError("Unterstützt werden PNG, JPEG und GIF.")
        except (OSError, ValueError, Image.DecompressionBombError) as error:
            self._set_status(f"Bild konnte nicht geladen werden: {error}", error=True)
            return
        self.selected_media = (media_type, base64.b64encode(media).decode("ascii"))
        self.media_status.configure(text=f"{image_format} ausgewählt")

    def create_post(self):
        text = self.post_text.get("1.0", "end").strip()
        if not text and not self.selected_media:
            self._set_status("Schreibe einen Beitrag oder wähle ein Bild aus.", error=True)
            return
        if len(text) > 2000:
            self._set_status("Beiträge dürfen höchstens 2000 Zeichen enthalten.", error=True)
            return
        try:
            self.stats_manager.set_community_author_name(self.name_entry.get())
        except (OSError, TypeError, ValueError) as error:
            self._set_status(str(error), error=True)
            return
        self.author_id, self.author_name = self.stats_manager.get_community_identity()
        media_type, media_data = self.selected_media or (None, None)
        payload = {
            "author_id": self.author_id,
            "author_name": self.author_name,
            "text": text,
            "media_type": media_type,
            "media_data": media_data,
        }
        self._run_request(
            "POST",
            f"{COMMUNITY_URL}/forum/posts",
            payload=payload,
            success_message="Dein Beitrag wurde veröffentlicht.",
            on_success=self._post_created,
        )

    def _post_created(self, _result):
        self.post_text.delete("1.0", "end")
        self.selected_media = None
        self.media_status.configure(text="")
        self.refresh_posts()

    def refresh_posts(self):
        self._run_request(
            "GET",
            f"{COMMUNITY_URL}/forum",
            params={"author_id": self.author_id, "limit": 20},
            on_success=self._render_posts,
        )

    def _render_posts(self, response):
        for widget in self.feed.winfo_children():
            widget.destroy()
        self._images = []
        posts = response.get("posts")
        if not isinstance(posts, list):
            self._set_status("Der Server hat eine ungültige Antwort gesendet.", error=True)
            return
        if not posts:
            ctk.CTkLabel(
                self.feed,
                text="Noch keine Beiträge. Starte die Unterhaltung!",
                font=ctk.CTkFont(size=16),
                text_color=TEXT_SECONDARY,
            ).pack(pady=32)
            self._set_status("Forum ist aktuell.")
            return
        for post in posts:
            self._render_post(post)
        self._set_status(f"{len(posts)} aktuelle Beiträge geladen.")

    def _render_post(self, post):
        card = ctk.CTkFrame(
            self.feed,
            fg_color=CARD_BG,
            corner_radius=16,
            border_width=1,
            border_color=CARD_BORDER,
        )
        card.pack(fill="x", padx=8, pady=7)
        author_name = post.get("author_name", "Community-Mitglied")
        created_at = self._format_time(post.get("created_at"))
        ctk.CTkLabel(
            card,
            text=f"{author_name}  ·  {created_at}",
            font=ctk.CTkFont(size=14, weight="bold"),
            anchor="w",
        ).pack(fill="x", padx=16, pady=(13, 5))
        text = post.get("text", "")
        if text:
            ctk.CTkLabel(
                card,
                text=text,
                font=ctk.CTkFont(size=15),
                justify="left",
                anchor="w",
                wraplength=680,
            ).pack(fill="x", padx=16, pady=(0, 8))
        self._render_image(card, post)

        post_id = post.get("id")
        reaction_frame = ctk.CTkFrame(card, fg_color="transparent")
        reaction_frame.pack(fill="x", padx=12, pady=(2, 6))
        counts = post.get("reactions", {})
        my_reactions = post.get("my_reactions", [])
        if not isinstance(counts, dict):
            counts = {}
        if not isinstance(my_reactions, list):
            my_reactions = []
        for emoji in REACTIONS:
            count = counts.get(emoji, 0)
            label = f"{emoji} {count}" if count else emoji
            ctk.CTkButton(
                reaction_frame,
                text=label,
                width=65,
                height=32,
                fg_color="#0A84FF" if emoji in my_reactions else CARD_BORDER,
                hover_color="#0066CC",
                command=lambda pid=post_id, value=emoji: self.toggle_reaction(pid, value),
            ).pack(side="left", padx=3)

        comments = post.get("comments", [])
        if isinstance(comments, list) and comments:
            comments_frame = ctk.CTkFrame(
                card,
                fg_color="#242426",
                corner_radius=12,
                border_width=1,
                border_color=CARD_BORDER,
            )
            comments_frame.pack(fill="x", padx=14, pady=(3, 8))
            for comment in comments[-20:]:
                ctk.CTkLabel(
                    comments_frame,
                    text=f"{comment.get('author_name', 'Gast')}: {comment.get('text', '')}",
                    font=ctk.CTkFont(size=13),
                    justify="left",
                    anchor="w",
                    wraplength=650,
                ).pack(fill="x", padx=12, pady=5)

        comment_row = ctk.CTkFrame(card, fg_color="transparent")
        comment_row.pack(fill="x", padx=14, pady=(0, 12))
        comment_entry = ctk.CTkEntry(
            comment_row,
            height=36,
            placeholder_text="Kommentar schreiben ...",
            font=ctk.CTkFont(size=14),
        )
        comment_entry.pack(side="left", fill="x", expand=True, padx=(0, 8))
        ctk.CTkButton(
            comment_row,
            text="Kommentieren",
            width=125,
            height=36,
            command=lambda pid=post_id, entry=comment_entry: self.create_comment(
                pid, entry
            ),
        ).pack(side="right")

    def _render_image(self, card, post):
        media_type = post.get("media_type")
        media_data = post.get("media_data")
        if not media_type or not media_data:
            return
        try:
            if (
                media_type not in {"image/png", "image/jpeg", "image/gif"}
                or not isinstance(media_data, str)
                or len(media_data) > ((MAX_IMAGE_SIZE + 2) // 3) * 4
            ):
                raise ValueError("Ungültiges Bildformat oder zu große Datei.")
            raw = base64.b64decode(media_data, validate=True)
            with Image.open(io.BytesIO(raw)) as image:
                if image.width * image.height > MAX_IMAGE_PIXELS:
                    raise ValueError("Das Bild überschreitet das Pixel-Limit.")
                if media_type == "image/gif" and image.format != "GIF":
                    raise ValueError("Ungültiges GIF.")
                if media_type == "image/png" and image.format != "PNG":
                    raise ValueError("Ungültiges PNG.")
                if media_type == "image/jpeg" and image.format != "JPEG":
                    raise ValueError("Ungültiges JPEG.")
                image.seek(0)
                preview = image.copy()
                preview.thumbnail((620, 420))
            image_label = ctk.CTkLabel(card, text="")
            image_label.pack(anchor="w", padx=16, pady=(0, 10))
            if media_type == "image/gif":
                self._animate_gif(image_label, raw, preview.size)
            else:
                photo = ctk.CTkImage(
                    light_image=preview,
                    dark_image=preview,
                    size=preview.size,
                )
                self._images.append(photo)
                image_label.configure(image=photo)
            if media_type == "image/gif":
                ctk.CTkLabel(
                    card,
                    text="GIF",
                    font=ctk.CTkFont(size=11),
                    text_color=TEXT_SECONDARY,
                ).pack(anchor="w", padx=16, pady=(0, 5))
        except (OSError, ValueError, binascii.Error, Image.DecompressionBombError):
            ctk.CTkLabel(
                card,
                text="Bildvorschau nicht verfügbar.",
                font=ctk.CTkFont(size=12),
                text_color=TEXT_SECONDARY,
            ).pack(anchor="w", padx=16, pady=(0, 8))

    def _animate_gif(self, label, raw, preview_size):
        stream = io.BytesIO(raw)
        image = Image.open(stream)
        frame_count = getattr(image, "n_frames", 1)

        def show_frame(index):
            if not label.winfo_exists():
                image.close()
                stream.close()
                return
            try:
                image.seek(index)
                frame = image.copy()
                frame.thumbnail(preview_size)
                photo = ctk.CTkImage(
                    light_image=frame,
                    dark_image=frame,
                    size=frame.size,
                )
                label.configure(image=photo)
                label._community_photo = photo
                delay = max(40, min(int(image.info.get("duration", 100)), 1000))
                label.after(delay, show_frame, (index + 1) % frame_count)
            except (OSError, ValueError, EOFError):
                image.close()
                stream.close()

        show_frame(0)

    def create_comment(self, post_id, entry):
        text = entry.get().strip()
        if not text:
            return
        if len(text) > 1000:
            self._set_status("Kommentare dürfen höchstens 1000 Zeichen enthalten.", error=True)
            return
        payload = {
            "author_id": self.author_id,
            "author_name": self.author_name,
            "text": text,
        }
        self._run_request(
            "POST",
            f"{COMMUNITY_URL}/forum/posts/{post_id}/comments",
            payload=payload,
            success_message="Kommentar veröffentlicht.",
            on_success=lambda _result: self.refresh_posts(),
        )

    def toggle_reaction(self, post_id, emoji):
        self._run_request(
            "POST",
            f"{COMMUNITY_URL}/forum/posts/{post_id}/reactions",
            payload={"author_id": self.author_id, "emoji": emoji},
            on_success=lambda _result: self.refresh_posts(),
        )

    @staticmethod
    def _format_time(timestamp):
        try:
            return datetime.fromtimestamp(float(timestamp)).strftime("%d.%m.%Y · %H:%M")
        except (TypeError, ValueError, OSError, OverflowError):
            return "gerade eben"

    def _run_request(
        self,
        method,
        url,
        payload=None,
        params=None,
        success_message=None,
        on_success=None,
    ):
        self._set_status("Verbinde mit der Community ...")

        def request():
            try:
                response = requests.request(
                    method,
                    url,
                    json=payload,
                    params=params,
                    timeout=10,
                )
                response.raise_for_status()
                result = response.json()
            except (requests.RequestException, ValueError) as error:
                detail = ""
                if isinstance(error, requests.HTTPError) and error.response is not None:
                    if error.response.status_code == 404:
                        detail = (
                            "Das Community-Forum ist auf dem Server noch nicht "
                            "verfügbar. Bitte aktualisiere/deploye die Server-API."
                        )
                    try:
                        body = error.response.json()
                        if not detail:
                            detail = (
                                body.get("detail", "")
                                if isinstance(body, dict)
                                else ""
                            )
                    except ValueError:
                        pass
                message = detail or "Community nicht erreichbar. Bitte Verbindung prüfen."
                self._request_events.put(("error", message, None, None))
                return

            self._request_events.put(
                ("success", success_message, result, on_success)
            )

        threading.Thread(target=request, daemon=True).start()

    def _poll_request_events(self):
        while True:
            try:
                status, message, result, callback = self._request_events.get_nowait()
            except queue.Empty:
                break
            if status == "error":
                self._set_status(message, error=True)
                continue
            if message:
                self._set_status(message)
            if callback:
                callback(result)
        if self.winfo_exists():
            self.after(100, self._poll_request_events)

    def _set_status(self, text, error=False):
        if self.winfo_exists():
            self.status_label.configure(
                text=text,
                text_color="#FF453A" if error else TEXT_SECONDARY,
            )
