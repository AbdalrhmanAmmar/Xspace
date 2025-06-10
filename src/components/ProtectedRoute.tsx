import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  // لو ما زلنا نتحقق من الجلسة
  if (loading) return null;           // أو <Spinner />

  // إذا لم يُسجَّل الدخول
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // إذا كانت الصفحة للأدمن فقط، والمستخدم ليس أدمن
  // (يمكنك الاعتماد على الدور بدلاً من البريد إن وُجد)
  if (adminOnly && user.username !== "x@spaces.com") {
    return <Navigate to="/" replace />;
  }

  // يُسمح بالدخول
  return <>{children}</>;
};
