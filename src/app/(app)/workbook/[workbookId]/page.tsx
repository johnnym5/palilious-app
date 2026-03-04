import WorkbookDetailPage from "@/components/workbook/WorkbookDetailPage";

// This tells Next.js not to try and generate pages for dynamic workbook IDs at build time.
export const dynamicParams = false;

// This function is required for static exports of dynamic routes.
// We return an empty array because we don't want to pre-render any specific workbook pages.
export function generateStaticParams() {
    return [];
}

// The Page component for a dynamic route.
export default function Page({ params }: { params: { workbookId: string } }) {
    // The WorkbookDetailPage is a Client Component and will get the workbookId from the URL using the useParams hook.
    // We don't need to pass params down to it.
    return <WorkbookDetailPage />;
}
