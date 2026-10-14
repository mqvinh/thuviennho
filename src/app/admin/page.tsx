import { LoadingIndicator } from "@/components/loading-indicator";
import { Suspense } from "react";
import { io } from "next/cache";
import { getTeacher } from "@/lib/auth";
import { TeacherDashboard } from "@/components/teacher-dashboard";
export default function Page() {
  return (
    <Suspense fallback={<LoadingIndicator label="Đang mở khu vực giáo viên" />}>
      <Content />
    </Suspense>
  );
}
async function Content() {
  await io();
  return <TeacherDashboard teacher={await getTeacher()} />;
}
