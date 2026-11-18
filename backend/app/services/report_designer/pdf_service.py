
from playwright.async_api import async_playwright


async def generate_pdf_bytes(html: str) -> bytes:
    """
    Convert dynamically generated HTML into an A4 PDF.
    """

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            headless=True,
        )

        try:
            page = await browser.new_page(
                device_scale_factor=1,
            )

            await page.set_content(
                html,
                wait_until="networkidle",
                timeout=60000,
            )

            await page.emulate_media(media="print")

            pdf_bytes = await page.pdf(
                format="A4",
                print_background=True,
                prefer_css_page_size=True,
                display_header_footer=False,
                margin={
                    "top": "15mm",
                    "bottom": "18mm",
                    "left": "14mm",
                    "right": "14mm",
                },
            )

            return pdf_bytes

        finally:
            await browser.close()
