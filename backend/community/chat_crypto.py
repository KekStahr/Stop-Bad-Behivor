import base64
import binascii
import json
import os
from hashlib import sha256

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric.x25519 import (
    X25519PrivateKey,
    X25519PublicKey,
)
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat


_AAD = b"reso-support-chat-v1"
_FINGERPRINT_PREFIX = b"reso-support-chat-fingerprint-v1"
_MAX_CIPHERTEXT_SIZE = ((500 * 1024 + 2) // 3) * 4 + 4096
_MAX_ENVELOPE_SIZE = ((_MAX_CIPHERTEXT_SIZE + 2) // 3) * 4


class EncryptedChatSession:
    def __init__(self):
        self._private_key = X25519PrivateKey.generate()
        self._public_key = self._private_key.public_key().public_bytes(
            Encoding.Raw,
            PublicFormat.Raw,
        )
        self._peer_public_key = None
        self._encryption_key = None

    @property
    def public_key(self):
        return base64.b64encode(self._public_key).decode("ascii")

    @property
    def is_ready(self):
        return self._encryption_key is not None

    def establish(self, peer_public_key):
        if not isinstance(peer_public_key, str):
            raise ValueError("Ungültiger Verschlüsselungsschlüssel.")
        try:
            peer_bytes = base64.b64decode(peer_public_key, validate=True)
        except (binascii.Error, ValueError) as error:
            raise ValueError("Ungültiger Verschlüsselungsschlüssel.") from error
        if len(peer_bytes) != 32 or peer_bytes == self._public_key:
            raise ValueError("Ungültiger Verschlüsselungsschlüssel.")
        if self._peer_public_key is not None:
            if peer_bytes != self._peer_public_key:
                raise ValueError("Der Sitzungsschlüssel hat sich unerwartet geändert.")
            return self.fingerprint

        peer_key = X25519PublicKey.from_public_bytes(peer_bytes)
        shared_secret = self._private_key.exchange(peer_key)
        self._encryption_key = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=None,
            info=_AAD,
        ).derive(shared_secret)
        self._peer_public_key = peer_bytes
        return self.fingerprint

    @property
    def fingerprint(self):
        if self._peer_public_key is None:
            return None
        first, second = sorted((self._public_key, self._peer_public_key))
        digest = sha256(_FINGERPRINT_PREFIX + first + second).hexdigest().upper()
        return " ".join(digest[index : index + 4] for index in range(0, len(digest), 4))

    def encrypt(self, packet):
        if self._encryption_key is None:
            raise RuntimeError("Die Chat-Verschlüsselung ist noch nicht bereit.")
        plaintext = json.dumps(
            packet,
            ensure_ascii=False,
            separators=(",", ":"),
        ).encode("utf-8")
        nonce = os.urandom(12)
        encrypted = AESGCM(self._encryption_key).encrypt(nonce, plaintext, _AAD)
        return base64.b64encode(nonce + encrypted).decode("ascii")

    def decrypt(self, envelope):
        if self._encryption_key is None:
            raise RuntimeError("Die Chat-Verschlüsselung ist noch nicht bereit.")
        if not isinstance(envelope, str):
            raise ValueError("Ungültige verschlüsselte Nachricht.")
        if len(envelope) > _MAX_ENVELOPE_SIZE:
            raise ValueError("Verschlüsselte Nachricht überschreitet das Größenlimit.")
        try:
            encrypted = base64.b64decode(envelope, validate=True)
            if len(encrypted) < 12 + 16 or len(encrypted) > _MAX_CIPHERTEXT_SIZE:
                raise ValueError("Ungültige verschlüsselte Nachricht.")
            plaintext = AESGCM(self._encryption_key).decrypt(
                encrypted[:12],
                encrypted[12:],
                _AAD,
            )
            packet = json.loads(plaintext)
        except (
            binascii.Error,
            InvalidTag,
            RecursionError,
            UnicodeDecodeError,
            ValueError,
        ) as error:
            raise ValueError("Nachricht konnte nicht authentifiziert werden.") from error
        if not isinstance(packet, dict):
            raise ValueError("Ungültige verschlüsselte Nachricht.")
        return packet
