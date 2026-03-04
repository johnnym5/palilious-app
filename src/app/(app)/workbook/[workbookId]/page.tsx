import WorkbookDetailPage from "@/components/workbook/WorkbookDetailPage";

// The Page component for a dynamic route.
export default function Page() {
    // The WorkbookDetailPage is a Client Component and will get the workbookId from the URL using the useParams hook.
    return <WorkbookDetailPage />;
}
