import EditPackage from "../[id]/page";
export default async function NewPackage({ searchParams }: { searchParams: Promise<{ msg?: string; tone?: string }> }) {
  return EditPackage({ params: Promise.resolve({ id: "new" }), searchParams });
}
