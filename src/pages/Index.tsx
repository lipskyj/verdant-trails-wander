import ForestExplorer from "@/components/ForestExplorer";
import { Helmet } from "react-helmet-async";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Forest Explorer | Immersive 3D Nature Experience</title>
        <meta name="description" content="Explore a beautiful 3D forest environment. Navigate through trees, discover nature, and experience the tranquility of a virtual woodland." />
      </Helmet>
      <ForestExplorer />
    </>
  );
};

export default Index;