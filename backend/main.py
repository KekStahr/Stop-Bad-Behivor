import sys

from backend.ui.app import ResoApp

if __name__ == "__main__":
    app = ResoApp(start_hidden="--hidden" in sys.argv)
    app.mainloop()