import LightMazeGame from "@/components/LightMazeGame";
import { Helmet } from "react-helmet-async";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>אי התעלומות | מדשאת האור — שיעור האור לכיתה ו'</title>
        <meta
          name="description"
          content="חוקרים צעירים נשלחים לאי התעלומות: שלוש תעלומות אור תלת־ממדיות — מפיקי ומחזירי אור, האור בקו ישר, ושקיפות חומרים."
        />

      </Helmet>
      <LightMazeGame />
    </>
  );
};

export default Index;
