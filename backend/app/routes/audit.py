from fastapi import APIRouter, UploadFile, File, Form
from app.utils.excel_reader import read_targeting_report
from app.services.audit_service import generate_summary, process_search_term_report
from app.services.ppt_service import generate_ppt
from fastapi.responses import FileResponse
from app.services.audit_service import process_search_term_report

router = APIRouter()

@router.post("/upload-report")
async def upload_report(
    file: UploadFile = File(...),
    target_acos: float = Form(...)
):
    filename = file.filename.lower()

    df = read_targeting_report(file)

    # ======================
    # Detect file type
    # ======================

    if "targeting" in filename:
        result = generate_summary(df, target_acos)
        report_type = "targeting"

    elif "search" in filename or "search_term" in filename:
        result = process_search_term_report(df, target_acos)
        report_type = "search_term"

    else:
        return {
            "error": "Unknown file type. Please upload correct Amazon report."
        }

    return {
        "report_type": report_type,
        "data": result
    }

@router.post("/download-ppt")
async def download_ppt(
    targeting_file: UploadFile = File(...),
    search_term_file: UploadFile = File(...),
    target_acos: float = Form(...),
    brand_name: str = Form(...)
):
    # Read files
    targeting_df = read_targeting_report(targeting_file)
    search_df = read_targeting_report(search_term_file)

    # Generate data
    summary = generate_summary(targeting_df, target_acos)
    search_data = process_search_term_report(search_df, target_acos)

    # Generate PPT
    ppt_path = generate_ppt(summary, target_acos, search_data, brand_name)

    return FileResponse(
        ppt_path,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        filename=f"{brand_name}_Audit_Report.pptx"
    )