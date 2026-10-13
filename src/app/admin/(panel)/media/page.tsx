import MediaLibrary from "../../MediaLibrary";
export default function Media() {
  return (
    <>
      <div className="page-head"><h1>Photos</h1></div>
      <p className="muted" style={{ maxWidth: 700 }}>Upload photos here or straight from any page, package or location. Big phone photos are resized automatically.</p>
      <MediaLibrary />
    </>
  );
}
