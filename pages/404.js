import Layout from "../components/Layout";

const notFound = () => {
  return (
    <Layout title="Page not found" description="Page not found">
      <section className="section">
        <div className="container">
          <div className="row">
            <div className="col-12">
              <h1 className="h1 mb-4 text-center">404</h1>
              <p className="text-center">Page not found</p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default notFound;
