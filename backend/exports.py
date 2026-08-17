import csv
import io
import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_csv_export(rows: list[dict]) -> str:
    output = io.StringIO()
    writer = csv.writer(output, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
    
    headers = [
        "document_id", "source_id", "source", "url_source", 
        "date_decision", "date_collecte", "juridiction", "type_document", 
        "verdict", "montant_alloue", "parties", "references_legales", 
        "niveau_confiance", "resume_automatique"
    ]
    writer.writerow(headers)
    
    for r in rows:
        writer.writerow([
            r.get("document_id"),
            r.get("source_id"),
            r.get("source"),
            r.get("url_source"),
            r.get("date_decision"),
            r.get("date_collecte"),
            r.get("juridiction"),
            r.get("type_document"),
            r.get("verdict"),
            r.get("montant_alloue"),
            "; ".join(r.get("parties", [])),
            "; ".join(r.get("references_legales", [])),
            r.get("niveau_confiance"),
            r.get("resume_automatique"),
        ])
        
    return "\ufeff" + output.getvalue()

def generate_pdf_export(rows: list[dict]) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'SubtitleStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#64748b'),
        spaceAfter=15
    )
    
    body_style = ParagraphStyle(
        'BodyStyle',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#334155'),
        spaceAfter=4
    )

    story = []
    story.append(Paragraph("Holding IVIR — Rapport des Données Juridiques", title_style))
    story.append(Paragraph(f"Généré le {datetime.utcnow().strftime('%d/%m/%Y à %H:%M UTC')} — {len(rows)} document(s)", subtitle_style))
    story.append(Spacer(1, 10))

    for idx, r in enumerate(rows, 1):
        src_upper = (r.get('source') or '').upper()
        doc_type = r.get('type_document') or 'Document juridique'
        src_id = r.get('source_id') or '—'
        jur = r.get('juridiction') or '—'
        verd = (r.get('verdict') or '—').upper()
        date_dec = r.get('date_decision') or '—'
        conf = r.get('niveau_confiance', 0)
        montant = r.get('montant_alloue')
        montant_str = f"{montant} €" if montant is not None else "—"
        resume = r.get('resume_automatique') or 'Aucun résumé disponible.'

        card_data = [
            [Paragraph(f"<b>{idx}. [{src_upper}] {doc_type}</b>", body_style)],
            [Paragraph(f"<b>Identifiant :</b> {src_id} | <b>Juridiction :</b> {jur} | <b>Verdict :</b> {verd}", body_style)],
            [Paragraph(f"<b>Date :</b> {date_dec} | <b>Confiance IA :</b> {conf}% | <b>Montant :</b> {montant_str}", body_style)],
            [Paragraph(f"<b>Résumé :</b> {resume}", body_style)]
        ]
        
        t = Table(card_data, colWidths=[530])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(t)
        story.append(Spacer(1, 8))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
