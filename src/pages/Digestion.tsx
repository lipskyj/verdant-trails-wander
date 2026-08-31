import { Helmet } from "react-helmet-async";
import BodyJourneyGame from "@/components/body/BodyJourneyGame";

const Digestion = () => {
  return (
    <>
      <Helmet>
        <title>מסע המזון | מערכת העיכול לכיתה ו'</title>
        <meta
          name="description"
          content="חוקרים צעירים עוקבים אחרי ביס מזון בגוף: חמש תחנות תלת־ממדיות — פה, ושט, קיבה, מעי דק ומעי גס, עם ניסויים, מדידות ודו״ח חוקר."
        />
        <meta property="og:title" content="מסע המזון | מערכת העיכול לכיתה ו'" />
        <meta
          property="og:description"
          content="חמש תחנות חקר תלת־ממדיות במערכת העיכול, עם שאלון כניסה, בדיקות דופק ודו״ח חוקר."
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      <BodyJourneyGame />
    </>
  );
};

export default Digestion;
