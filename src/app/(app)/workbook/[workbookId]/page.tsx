import WorkbookDetailPage from "@/components/workbook/WorkbookDetailPage";

// This function is required for static exports of dynamic routes.
// It tells Next.js not to pre-render any specific workbook pages at build time.
// Navigation to these pages will be handled on the client-side.
export function generateStaticParams() {
    return [];
}

// The Page component for a dynamic route should accept params, even if it's
// a shell that renders a Client Component that uses `useParams`.
export default function Page({ params }: { params: { workbookId: string } }) {
    // The WorkbookDetailPage is a Client Component and will get the workbookId from the URL using the useParams hook.
    // We don't need to pass params down to it.
    return <WorkbookDetailPage />;
}
