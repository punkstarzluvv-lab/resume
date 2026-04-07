import os
import glob

# HTML chunks to insert
nav_toggle = """
            <!-- Mobile Menu Toggle -->
            <button class="mobile-menu-toggle" id="mobileMenuBtn" aria-label="Toggle Menu">
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
            </button>

            <nav class="top-nav">"""

nav_overlay = """        </header>

        <!-- Mobile Nav Overlay -->
        <div class="mobile-nav-overlay" id="mobileNav">
            <nav class="mobile-nav-content">
                <div class="placeholder-btn nav-btn" onclick="window.location.href='index.html'">[Home]</div>
                <div class="placeholder-btn nav-btn" onclick="window.location.href='projects.html'">[Projects]</div>
                <div class="placeholder-btn nav-btn" onclick="window.location.href='capabilities.html'">[Capabilities]</div>
                <div class="placeholder-btn nav-btn" onclick="window.location.href='about.html'">[About Me]</div>
                <div class="placeholder-btn nav-btn contact-btn" onclick="window.location.href='resume-contact.html'">[Contact/Resumé]</div>
            </nav>
        </div>"""

def inject():
    html_files = glob.glob('*.html')
    for file in html_files:
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()

        changed = False

        if '<nav class="top-nav">' in content and 'mobile-menu-toggle' not in content:
            content = content.replace('<nav class="top-nav">', nav_toggle, 1)
            changed = True

        if '</header>' in content and 'mobile-nav-overlay' not in content:
            content = content.replace('</header>', nav_overlay, 1)
            changed = True

        if changed:
            with open(file, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated {file}")
        else:
            print(f"Skipped {file} (already updated or no match)")

if __name__ == '__main__':
    inject()
