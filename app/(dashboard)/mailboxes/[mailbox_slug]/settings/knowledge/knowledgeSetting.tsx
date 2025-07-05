import KnowledgeBankSetting from "./knowledgeBankSetting";
import WebsiteCrawlSetting from "./websiteCrawlSetting";

const KnowledgeSetting = ({ websitesEnabled }: { websitesEnabled: boolean }) => {
  return (
    <>
      <div className="space-y-6">
        {websitesEnabled && <WebsiteCrawlSetting />}
        <KnowledgeBankSetting />
      </div>
    </>
  );
};

export default KnowledgeSetting;
