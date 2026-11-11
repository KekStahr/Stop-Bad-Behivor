import customtkinter as ctk
import pystray
from PIL import Image, ImageTk
import threading
import sys
import time
import math
import queue
import logging
from pathlib import Path
import base64
import binascii
import io
import json
from tkinter import filedialog
import websocket
from datetime import date, datetime, timedelta
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from pynput import keyboard

from backend.core.timer import FocusTimer
from backend.core.monitor import BadBehaviorMonitor
from backend.core.stats import StatsManager
from backend.community.chat_crypto import EncryptedChatSession
from backend.integrations.icon import create_app_icon
from backend.integrations.ai_motivator import MotivationManager
from backend.integrations.discord_rpc import DiscordRPCManager
from backend.integrations.autostart import is_autostart_enabled, setup_autostart
from backend.community.community_forum import CommunityForum
from backend.api.web_api import LocalWebApi

# Design-Konfiguration
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme(str(Path(__file__).resolve().parents[1] / "assets" / "apple_dark.json"))
ctk.set_widget_scaling(1.2)

BG_DARK = "#111113"
CARD_BG = "#1C1C1E"
CARD_BORDER = "#38383A"
ACCENT_RED = "#FF453A"
ACCENT_GREEN = "#30D158"
ACCENT_ORANGE = "#FF9F0A"
ACCENT_BLUE = "#0A84FF"
TEXT_PRIMARY = "#F5F5F7"
TEXT_SECONDARY = "#A1A1A6"

plt.rcParams.update(
    {
        "font.family": "sans-serif",
        "font.sans-serif": ["Segoe UI", "Arial", "DejaVu Sans"],
        "text.color": TEXT_SECONDARY,
        "axes.labelcolor": TEXT_SECONDARY,
        "xtick.color": TEXT_SECONDARY,
        "ytick.color": TEXT_SECONDARY,
    }
)



__all__ = [name for name in globals() if not name.startswith("__")]
