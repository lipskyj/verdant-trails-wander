import PhotosynthesisGame from "@/components/PhotosynthesisGame";
import { Helmet } from "react-helmet-async";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Photosynthesis | Grow Your Plant Game</title>
        <meta name="description" content="Collect sunlight, grow your plant, and compete with other trees in this relaxing photosynthesis simulation game." />
      </Helmet>
      <PhotosynthesisGame />
    </>
  );
};

export default Index;