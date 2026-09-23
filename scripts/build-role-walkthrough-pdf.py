#!/usr/bin/env python3
"""Build WCC-FE Role × Screen walkthrough PDF for Desktop."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
SHOT_DIR = ROOT / "docs" / "role-screenshots"
DESKTOP = Path.home() / "Desktop"
OUT_PDF = DESKTOP / "WCC-FE_Role_Screen_Walkthrough.pdf"

PAGE_W, PAGE_H = A4
MARGIN = 16 * mm


def styles():
    base = getSampleStyleSheet()
    return {
        "cover_title": ParagraphStyle(
            "cover_title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#0a0a0a"),
            alignment=TA_CENTER,
            spaceAfter=8,
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=11,
            leading=15,
            textColor=colors.HexColor("#52525b"),
            alignment=TA_CENTER,
            spaceAfter=4,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=colors.HexColor("#0a0a0a"),
            spaceBefore=4,
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=17,
            textColor=colors.HexColor("#18181b"),
            spaceBefore=10,
            spaceAfter=6,
        ),
        "h3": ParagraphStyle(
            "h3",
            parent=base["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#27272a"),
            spaceBefore=8,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13,
            textColor=colors.HexColor("#3f3f46"),
            alignment=TA_JUSTIFY,
            spaceAfter=6,
        ),
        "caption": ParagraphStyle(
            "caption",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#71717a"),
            alignment=TA_CENTER,
            spaceBefore=3,
            spaceAfter=10,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#3f3f46"),
        ),
        "meta": ParagraphStyle(
            "meta",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#71717a"),
            alignment=TA_CENTER,
        ),
        "note": ParagraphStyle(
            "note",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#52525b"),
            backColor=colors.HexColor("#f4f4f5"),
            borderPadding=6,
            spaceAfter=8,
        ),
    }


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#e4e4e7"))
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, 12 * mm, PAGE_W - MARGIN, 12 * mm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(colors.HexColor("#71717a"))
    canvas.drawString(MARGIN, 7 * mm, "WODI Command Center (WCC-FE) — Role × Screen Walkthrough")
    canvas.drawRightString(PAGE_W - MARGIN, 7 * mm, f"Page {doc.page}")
    canvas.restoreState()


def fit_image(path: Path, max_w: float, max_h: float) -> Image:
    with PILImage.open(path) as im:
        w, h = im.size
    scale = min(max_w / w, max_h / h)
    return Image(str(path), width=w * scale, height=h * scale)


def bullets(items: list[str], st) -> ListFlowable:
    return ListFlowable(
        [ListItem(Paragraph(i, st["bullet"]), leftIndent=8, bulletColor=colors.HexColor("#0a0a0a")) for i in items],
        bulletType="bullet",
        start="•",
        leftIndent=12,
        spaceBefore=2,
        spaceAfter=6,
    )


def section_matrix(st) -> list:
    data = [
        [
            Paragraph("<b>Role</b>", st["bullet"]),
            Paragraph("<b>Home</b>", st["bullet"]),
            Paragraph("<b>Nav access</b>", st["bullet"]),
            Paragraph("<b>Admin</b>", st["bullet"]),
        ],
        ["gm", "Manager dashboard", "Dashboard, Pipeline, Tasks, Customers, Packages", "Users / Roles / Audit"],
        ["manager", "Manager dashboard", "Same operational nav (no admin)", "—"],
        ["finance", "Manager dashboard*", "Same operational nav (no admin)", "—"],
        ["employee", "Workspace", "Workspace, Pipeline, Tasks, Customers, Packages", "—"],
        ["operations", "Workspace", "Same as employee landing", "—"],
        ["admin", "Admin → Users", "Ops nav + Users / Roles / Audit", "Full admin"],
    ]
    # wrap cells
    wrapped = []
    for row in data:
        wrapped.append([Paragraph(str(c), st["bullet"]) if not isinstance(c, Paragraph) else c for c in row])
    t = Table(wrapped, colWidths=[22 * mm, 32 * mm, 78 * mm, 36 * mm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0a0a0a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#fafafa")),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#e4e4e7")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return [
        Paragraph("1. Role access matrix", st["h1"]),
        Paragraph(
            "WCC-FE is the internal Hajj/Umrah Command Center UI. Authentication uses demo credentials when the API is offline "
            "(password <b>ChangeMe123!</b>). Middleware gates unauthenticated users to Login, redirects employees away from "
            "/manager, and restricts /admin/* to <b>gm</b> and <b>admin</b>.",
            st["body"],
        ),
        t,
        Paragraph(
            "* Finance currently lands on the manager home route by configuration; dedicated finance screens are not yet shipped.",
            st["note"],
        ),
        Spacer(1, 4 * mm),
    ]


def section_workflows(st) -> list:
    return [
        Paragraph("2. End-to-end business workflows", st["h1"]),
        Paragraph("2.1 Sales journey (employee / manager / gm)", st["h2"]),
        bullets(
            [
                "<b>Capture demand:</b> Create a <b>Lead</b> on Pipeline (name, phone, source, owner; optional customer link). Lead starts in <b>New</b>.",
                "<b>Work the funnel:</b> Advance stages New → Contacted → Qualified → Proposal → Won (or Lost with a coded reason). Invalid jumps are blocked.",
                "<b>Own the work:</b> Assign / bulk-assign owners; open lead detail drawer for notes and history.",
                "<b>Convert:</b> When a customer is linked, Convert creates a draft booking against a package departure.",
                "<b>Customer 360:</b> Maintain identity, companions, related leads/bookings on the customer profile.",
                "<b>Inventory:</b> Packages hold product templates; Package Detail manages dated departures and capacity.",
                "<b>Execution:</b> Tasks board tracks operational follow-ups (complete / reschedule / confirm booking tasks).",
            ],
            st,
        ),
        Paragraph("2.2 Management journey (manager / gm / finance landing)", st["h2"]),
        bullets(
            [
                "Open <b>Manager Dashboard</b> for exception-first KPIs (live when API connected; otherwise placeholder/metrics shell).",
                "Supervise Pipeline conversion and Task SLA from the same Soft Light shell.",
                "GM additionally audits Users, Roles matrix, and Audit log under Admin.",
            ],
            st,
        ),
        Paragraph("2.3 Admin journey (gm / admin)", st["h2"]),
        bullets(
            [
                "Create and activate/deactivate staff accounts; assign roles and branches.",
                "Review the read-only role → capability matrix (API-enforced permissions).",
                "Inspect audit events (who changed what).",
            ],
            st,
        ),
        Paragraph("2.4 What “Create Lead” means (analyst definition)", st["h2"]),
        Paragraph(
            "A <b>Lead</b> is a sales opportunity—not yet a booking. Creating a lead places a person into the CRM pipeline so the team can "
            "follow up through defined stages. A <b>Customer</b> is the durable CRM identity (Customer 360). A <b>Booking</b> is inventory "
            "commitment (often created via Convert). Leads can optionally link to an existing customer before conversion.",
            st["body"],
        ),
        PageBreak(),
    ]


def section_gaps(st) -> list:
    return [
        Paragraph("3. Current maturity — sketches & planned additions", st["h1"]),
        Paragraph(
            "The product is a Soft Light FSD skeleton with strong UX chrome. Several domains remain demo/memory-backed or incomplete.",
            st["body"],
        ),
        Paragraph("Known gaps / sketches", st["h2"]),
        bullets(
            [
                "<b>F6 Bookings:</b> No dedicated bookings board; Customer 360 bookings remain stub/demo in places.",
                "<b>Live API:</b> Many entities still use memory repositories when BE is offline; production needs full Api* wiring.",
                "<b>Finance / Operations:</b> Roles exist in auth seed, but dedicated finance (payments, unpaid) and ops workspaces are thin—finance reuses manager home.",
                "<b>Manager KPIs:</b> Dashboard cards may show placeholders until analytics API is connected.",
                "<b>Task queue depth:</b> Task UX exists; full SLA ops, notifications, and cross-entity deep-links continue to harden.",
                "<b>Permissions:</b> UI nav gates admin; fine-grained capability checks still largely API-side / partial on FE.",
                "<b>Arabic parity:</b> RTL + messages exist; some operational labels still being equalized.",
            ],
            st,
        ),
        Paragraph("Planned / next additions (high level)", st["h2"]),
        bullets(
            [
                "Bookings module (list, payment status, docs checklist) closing F6.",
                "Real-time KPI dashboards for GM/manager and finance unpaid views.",
                "Stronger branch scoping, session security (HttpOnly cookies), and API-first repositories everywhere.",
                "Richer task automation from booking confirmations and pipeline events.",
                "Role-specific home experiences for finance and operations (not shared landings).",
            ],
            st,
        ),
        PageBreak(),
    ]


def screen_block(st, role_label: str, title: str, file_name: str, capabilities: list[str]) -> list:
    path = SHOT_DIR / file_name
    if not path.exists():
        return [Paragraph(f"<i>Missing screenshot: {file_name}</i>", st["caption"])]
    max_w = PAGE_W - 2 * MARGIN
    max_h = 145 * mm
    img = fit_image(path, max_w, max_h)
    parts = [
        Paragraph(f"{role_label} — {title}", st["h3"]),
        bullets(capabilities, st),
        img,
        Paragraph(file_name, st["caption"]),
    ]
    return [KeepTogether(parts)]


# Capability copy per screen key (shared across roles; admin screens separate)
CAPS = {
    "login": [
        "Sign in with email/password; demo fallback when API is offline.",
        "Locale switcher (EN/AR) available before authentication.",
    ],
    "home-manager": [
        "Exception-first manager dashboard (KPI cards / analytics shell).",
        "Entry point for gm, manager, and finance landings.",
    ],
    "home-workspace": [
        "Employee/operations daily home: queue + pipeline shortcuts.",
        "Jump into CRM pipeline and task work.",
    ],
    "home-admin": [
        "Admin home lands on Users administration.",
    ],
    "pipeline": [
        "Kanban + table views of leads by stage.",
        "Create lead, assign / bulk-assign, stage transitions, lost reasons, convert to booking, filters.",
    ],
    "tasks": [
        "Operational task board: view, complete, reschedule, booking-related confirmations.",
        "Search/filter Soft Light toolbar pattern.",
    ],
    "customers": [
        "Search/filter customers; create customer; open Customer 360.",
        "Merge/edit flows available from customer surfaces where implemented.",
    ],
    "customer-360": [
        "Identity profile, related leads, bookings tabs, companions linking.",
        "Bridge between pipeline opportunity and durable CRM record.",
    ],
    "packages": [
        "List package templates; create package; open dated departures.",
    ],
    "package-detail": [
        "Manage departures: create, clone, capacity badges, pricing display.",
    ],
    "admin-users": [
        "Create/activate staff users; assign role and branch.",
    ],
    "admin-roles": [
        "Read-only role → capability matrix (API-enforced).",
    ],
    "admin-audit": [
        "Audit log of actor/entity/actions for compliance review.",
    ],
}


def caps_for(key: str, role: str) -> list[str]:
    if key == "home":
        if role in ("employee", "operations"):
            return CAPS["home-workspace"]
        if role == "admin":
            return CAPS["home-admin"]
        return CAPS["home-manager"]
    return CAPS.get(key, ["Screen available for this role."])


def build():
    manifest = json.loads((SHOT_DIR / "manifest.json").read_text())
    st = styles()
    story: list = []

    # Cover
    story.append(Spacer(1, 28 * mm))
    story.append(Paragraph("WODI Command Center", st["cover_title"]))
    story.append(Paragraph("Frontend (WCC-FE)", st["cover_title"]))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph("Role × Screen Walkthrough", st["cover_sub"]))
    story.append(
        Paragraph(
            "Complete UI screenshot atlas with role capabilities, workflows, and known gaps",
            st["cover_sub"],
        )
    )
    story.append(Spacer(1, 10 * mm))
    story.append(
        Paragraph(
            f"Captured: {manifest.get('capturedAt', datetime.now(timezone.utc).isoformat())}",
            st["meta"],
        )
    )
    story.append(Paragraph("Locale shown: English (/en) · Soft Light shell", st["meta"]))
    story.append(Paragraph("Classification: Internal product documentation", st["meta"]))
    story.append(PageBreak())

    # TOC-ish overview
    story.extend(section_matrix(st))
    story.extend(section_workflows(st))
    story.extend(section_gaps(st))

    # Login
    story.append(Paragraph("4. Authentication", st["h1"]))
    story.extend(
        screen_block(
            st,
            "All roles",
            "Sign in",
            manifest["loginShot"],
            CAPS["login"],
        )
    )
    story.append(PageBreak())

    # Per role
    story.append(Paragraph("5. Screens by role (complete atlas)", st["h1"]))
    story.append(
        Paragraph(
            "Each subsection lists what the role can do on that screen, followed by the full-page screenshot captured from the running application.",
            st["body"],
        )
    )

    for role in manifest["roles"]:
        story.append(PageBreak())
        story.append(Paragraph(f"Role: {role['label']}", st["h1"]))
        story.append(
            Paragraph(
                f"Screens captured: {len(role['screens'])}. Navigation is role-aware; admin routes appear only for gm/admin.",
                st["body"],
            )
        )
        for screen in role["screens"]:
            story.extend(
                screen_block(
                    st,
                    role["label"],
                    screen["title"],
                    screen["file"],
                    caps_for(screen["key"], role["role"]),
                )
            )

    # Closing
    story.append(PageBreak())
    story.append(Paragraph("6. Document control", st["h1"]))
    story.append(
        Paragraph(
            "This PDF was generated from automated Playwright full-page captures against the local Next.js app and assembled with ReportLab. "
            "Screens reflect the Soft Light design system (shared ListScreen / SearchFilterBar / dialogs). Re-run capture via "
            "<font face='Courier'>pnpm exec playwright test --config=playwright.capture.config.ts</font> then regenerate this PDF.",
            st["body"],
        )
    )
    story.append(
        Paragraph(
            "Demo users: gm@ / manager@ / sales@ / admin@ / finance@ / ops@ — all @wodi.local — password ChangeMe123!",
            st["body"],
        )
    )

    DESKTOP.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUT_PDF),
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=14 * mm,
        bottomMargin=16 * mm,
        title="WCC-FE Role × Screen Walkthrough",
        author="WODI Command Center",
    )
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(OUT_PDF)


if __name__ == "__main__":
    build()
