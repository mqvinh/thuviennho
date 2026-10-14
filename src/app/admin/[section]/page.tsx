import { LoadingIndicator } from "@/components/loading-indicator";
import { Suspense } from "react";
import { io } from "next/cache";
import { notFound } from "next/navigation";
import { getTeacher } from "@/lib/auth";
import { TeacherDashboard } from "@/components/teacher-dashboard";
import { adminTitles, adminOnlyViews, type AdminView } from "@/lib/admin-sections";
export default function Page({params, searchParams}: PageProps<"/admin/[section]">) {
return <Suspense fallback={<LoadingIndicator label="Đang mở trang quản lý" />}><Content params={params} searchParams={searchParams}/></Suspense>;
}
async function Content({params,searchParams}: PageProps<"/admin/[section]">) {
await io();
const {section} = await params;
if (!Object.hasOwn(adminTitles, section)) notFound();
const teacher = await getTeacher();
if (teacher && adminOnlyViews.includes(section as AdminView) && teacher.role !== "admin") notFound();
const query = await searchParams;
return <TeacherDashboard key={`${section}:${typeof query.slug === "string" ? query.slug : ""}:${typeof query.id === "string" ? query.id : ""}:${query.saved === "1"}`} teacher={teacher} view={section as AdminView} editSlug={typeof query.slug === "string" ? query.slug : ""} editId={typeof query.id === "string" ? query.id : ""}/>;
}
