from typing import Optional
from pydantic import BaseModel


class ProofOverride(BaseModel):
    mode: str                      # "mock" | "real"


class EmploymentClaimRequest(BaseModel):
    user_email: str                # hashed before storage — never stored raw
    company_name: str              # hashed to company_hash
    role: str                      # job title, stored as-is (not sensitive)
    start_date: str                # "YYYY-MM" format
    end_date: Optional[str] = None # None = current job
    linkedin_url: Optional[str] = None
    proof_override: Optional[ProofOverride] = None


class VerifyClaimRequest(BaseModel):
    claim_id: str
    verifier_email: str            # hashed before storage
    verification_type: str         # "email_domain" | "linkedin" | "document" | "manual"
    company_email_domain: Optional[str] = None   # e.g. "deloitte.com"
    linkedin_match: Optional[bool] = None
    endorsements: Optional[int] = 0


class AuditRequest(BaseModel):
    claim_id: str
