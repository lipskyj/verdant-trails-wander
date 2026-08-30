import LightMazeGame from "@/components/LightMazeGame";
import { Helmet } from "react-helmet-async";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>מבוך האור | מועדון החוקרים - חדר 1</title>
        <meta
          name="description"
          content="סימולציה תלת־ממדית לכיתה ו': זהו מפיקי אור לעומת מחזירי אור, בחרו מסלול חקר אישי והשיגו את פנס הקסם."
        />
      </Helmet>
      <LightMazeGame />
    </>
  );
};

export default Index;
