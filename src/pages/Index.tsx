import LightMazeGame from "@/components/LightMazeGame";
import { Helmet } from "react-helmet-async";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>אי התעלומות | מדשאת האור — שיעור האור לכיתה ו'</title>
        <meta
          name="description"
          content="חוקרים צעירים נשלחים לאי התעלומות: חמש תעלומות אור תלת־ממדיות — מפיקי ומחזירי אור, האור בקו ישר, שקיפות חומרים, פירוק פנס וספר זום."
        />

      </Helmet>
      <LightMazeGame />
    </>
  );
};

export default Index;
