from .shared import *
from .analytics import AnalyticsMixin
from .api import ApiMixin
from .community import CommunityMixin
from .community_widgets import CommunityWidgetsMixin
from .dialogs import DialogsMixin
from .home import HomeMixin
from .home_widgets import HomeWidgetsMixin
from .settings import SettingsMixin
from .settings_widgets import SettingsWidgetsMixin
from .timer import TimerMixin
from .timer_widgets import TimerWidgetsMixin
from .tray import TrayMixin
from .widgets import WidgetsMixin
from .analytics_widgets import AnalyticsWidgetsMixin


class ResoApp(
    ApiMixin,
    TrayMixin,
    WidgetsMixin,
    SettingsWidgetsMixin,
    SettingsMixin,
    CommunityMixin,
    TimerMixin,
    HomeMixin,
    AnalyticsMixin,
    DialogsMixin,
    HomeWidgetsMixin,
    TimerWidgetsMixin,
    CommunityWidgetsMixin,
    AnalyticsWidgetsMixin,
    ctk.CTk,
):
    def __init__(self, start_hidden=False):
        super().__init__()

        self.title("Reşo : You vs You")
        self.geometry("1120x900")
        self.minsize(960, 760)
        self.resizable(True, True)
        self.configure(fg_color=BG_DARK)
        self.start_hidden = start_hidden
        if start_hidden:
            self.withdraw()

        # Icon oben links & Taskleiste
        self.pil_icon = create_app_icon()
        self.tk_icon = ImageTk.PhotoImage(self.pil_icon)
        self.wm_iconphoto(True, self.tk_icon)

        self.stats_manager = StatsManager()
        self.motivation_manager = MotivationManager(self.stats_manager)
        self.discord_rpc = DiscordRPCManager()

        self.lockout_end_time = 0
        self.pin_unlocked = False
        self.pending_deletions = {}
        self.hotkey_listener = None
        self.reframing_dialog_active = False
        self.rescue_dialog_active = False
        self.shadow_letter_dialog_active = False
        self.stress_dialog_active = False
        self.is_shutting_down = False
        self.shutdown_remaining_seconds = 0
        self.shutdown_deadline = 0.0
        self.shutdown_after_id = None
        self._home_flame_animation_id = None
        self._home_flame_animation_phase = 0
        self._home_clock_animation_id = None
        self._home_clock_animation_started_at = 0.0
        self._home_clock_progress_starts = {}
        self.ai_pauses_enabled = bool(
            self.stats_manager.get_stats().get("ai_pauses_enabled", False)
        )
        self.ai_pause_min = int(self.stats_manager.get_stats().get("ai_pause_min", 10))
        self.ai_pause_max = int(self.stats_manager.get_stats().get("ai_pause_max", 20))
        persisted_deadline = self.stats_manager.get_shutdown_deadline()
        if persisted_deadline is not None:
            remaining = persisted_deadline - time.time()
            if remaining > 0:
                self.is_shutting_down = True
                self.shutdown_deadline = time.monotonic() + remaining
                self.withdraw()
            else:
                self.stats_manager.set_shutdown_deadline(None)

        self.target_processes = ["chrome.exe", "msedge.exe", "firefox.exe", "discord.exe"]
        self.monitor = BadBehaviorMonitor(self.stats_manager, self.target_processes)
        self.whitelist_enabled = bool(
            self.stats_manager.get_stats().get("whitelist_mode_enabled", False)
        )

        self.focus_timer = FocusTimer(
            update_callback=self.update_timer_display,
            finish_callback=self.on_timer_finished
        )

        self.tray_icon = None
        self.setup_tray()

        self.create_widgets()
        self._apply_apple_widget_style()
        self.monitor.on_trigger_callback = self.handle_trigger_event
        self.monitor.on_stress_callback = self.handle_stress_event
        self.monitor.start_monitoring()
        self.update_stats_display()
        self.refresh_stoic_quote()
        self._streak_ticker_id = self.after(1000, self._live_ticker)
        self._home_flame_animation_id = self.after(250, self._animate_home_flame)
        if self.is_shutting_down:
            self.after(0, self._show_home_hub)
            self.after(0, self._run_shutdown_countdown)
        if not self.start_hidden and not self.is_shutting_down:
            self.after(800, self.show_startup_prompts)
        self.refresh_community_stats()
        self.refresh_community_leaderboard()
        if (
            self.stats_manager.get_stats().get("account_id")
            and self.stats_manager.get_stats().get("cloud_backup_initialized")
        ):
            self.after(100, self.sync_cloud_on_startup)

        # Globaler Hotkey für den Panic-Button starten
        self.setup_panic_hotkey_listener()
        self._web_api_requests = queue.Queue()
        self.web_api = None
        if "--web-api" in sys.argv:
            self.web_api = LocalWebApi(self._queue_web_api_request)
            self.after(25, self._poll_web_api_requests)

        self.protocol("WM_DELETE_WINDOW", self.hide_to_tray)
