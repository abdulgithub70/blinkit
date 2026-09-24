import { redirect } from "next/navigation";

// The old /products page is now the home page.
export default function ProductsPage() {
  redirect("/");
}
