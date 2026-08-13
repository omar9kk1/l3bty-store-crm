import { EmployeeDetailsPage } from "@/features/employees/components/EmployeeDetailsPage";
export default async function Page({ params }: { params: Promise<{ employeeId: string }> }) { const { employeeId } = await params; return <EmployeeDetailsPage employeeId={employeeId} />; }
