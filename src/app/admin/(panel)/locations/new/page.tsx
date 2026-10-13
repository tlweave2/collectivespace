import EditLocation from "../[id]/page";
export default async function NewLocation() { return EditLocation({ params: Promise.resolve({ id: "new" }) }); }
