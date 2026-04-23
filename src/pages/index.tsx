/* eslint-disable */
import Layout from "../../components/Layout/Layout";
import MainPartSection from "./Service";
import { NextPageWithLayout } from "./_app";
import Head from "next/head";

const Home: NextPageWithLayout = () => {
  return (
    <>
      <>
        <Head>
          <title>Mechatronics and Robotics</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link href="/logo/MechaLogo.png" rel="icon" />
          <meta property="og:title" content="Mechatronics and Robotics" />
        </Head>
      </>
      <MainPartSection />
    </>
  );
};

Home.getLayout = (page) => (
  <Layout hideFooter showMainFooter>
    {page}
  </Layout>
);

export default Home;
