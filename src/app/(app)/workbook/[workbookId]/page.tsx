import WorkbookDetailPage from "@/components/workbook/WorkbookDetailPage";

// This function is required for static exports of dynamic routes.
// It tells Next.js not to pre-render any specific workbook pages at build time.
// Navigation to these pages will be handled on the client-side.
export async function generateStaticParams() {
    return [];
}

export default function Page() {
    return <WorkbookDetailPage />;
}
