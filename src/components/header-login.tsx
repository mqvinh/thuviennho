import Link from "next/link";
import { MenuIcon } from "./menu-icon";

export function HeaderLogin() {
  return <Link className="header-login" href="/admin"><MenuIcon name="login" />Đăng nhập</Link>;
}
