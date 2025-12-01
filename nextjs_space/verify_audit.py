from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_audit_table(page: Page):
    # Enable console log capture
    page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
    page.on("pageerror", lambda exc: print(f"Browser Error: {exc}"))

    print("Navigating to page...")
    # Increase timeout to 60s for initial load
    response = page.goto("http://localhost:3000/test-audit", wait_until="networkidle", timeout=60000)
    print(f"Response status: {response.status}")

    # Take a screenshot of initial load state
    page.screenshot(path="/home/jules/verification/initial_load.png")

    # Wait for the table to be visible
    print("Waiting for heading...")
    expect(page.get_by_role("heading", name="Auditoria de Caixa")).to_be_visible(timeout=30000)

    # 1. Verify "Saldo Final Informado" logic in the footer
    # Click on the first "Ver Extrato" button (corresponding to caixa-1)
    # Since there are multiple buttons, we pick the first one.
    print("Clicking 'Ver Extrato'...")
    buttons = page.get_by_role("button", name="Ver Extrato")
    buttons.first.click()

    # Wait for Sheet to open
    print("Waiting for Sheet...")
    expect(page.get_by_text("Extrato do Caixa")).to_be_visible(timeout=10000)

    # Check for Footer elements
    expect(page.get_by_text("Saldo Final Informado")).to_be_visible()
    expect(page.get_by_text("Quebra Total")).to_be_visible()

    # Check calculated value for caixa-1: 100 + 50 + 0 = 150
    expect(page.get_by_text("R$ 150,00")).to_be_visible()

    # Take screenshot of the open sheet
    page.screenshot(path="/home/jules/verification/audit_sheet_footer.png")
    print("Verification success!")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_audit_table(page)
        except Exception as e:
            print(f"Script Error: {e}")
            page.screenshot(path="/home/jules/verification/error_debug.png")
        finally:
            browser.close()
