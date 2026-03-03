export const PREDEFINED_DEPARTMENTS = [
    "Administration & Human Resources (HR)",
    "Finance & Accounting",
    "Operations & Production",
    "Sales & Marketing",
    "Information Technology (IT)",
    "Executive",
] as const;

export const PREDEFINED_ROLES = [
    // Executive
    "CEO / Managing Director",

    // Administration & Human Resources (HR)
    "HR Manager / Director",
    "HR Officer / Specialist",
    "Payroll Administrator",
    "Office Manager / Admin Lead",
    "Front Desk Officer / Receptionist",

    // Finance & Accounting
    "Chief Financial Officer (CFO) / Finance Manager",
    "Accountant",
    "Accounts Payable (AP) Clerk",
    "Accounts Receivable (AR) Clerk",
    "Auditor / Compliance Officer",

    // Operations & Production
    "Operations Manager",
    "Project Manager",
    "Quality Assurance (QA) Specialist",
    "Procurement / Supply Chain Officer",
    "Logistics / Dispatch Coordinator",

    // Sales & Marketing
    "Sales Manager",
    "Business Development Representative (BDR)",
    "Marketing Coordinator",
    "Content Creator / Designer",
    "Customer Success / Account Manager",

    // Information Technology (IT)
    "IT Manager / CTO",
    "Systems Administrator",
    "IT Support / Helpdesk Technician",
    "Software Developer",
    "Data Analyst",

    // Special & Generic
    "Organization Administrator", // Special role
    "Staff", // Generic fallback
] as const;
