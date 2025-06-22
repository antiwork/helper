"use client";

import KnowledgeBankSetting from "./knowledgeBankSetting";
import WebsiteCrawlSetting from "./websiteCrawlSetting";

const KnowledgeSetting = ({ websitesEnabled }: { websitesEnabled: boolean }) => {
  return (
    <>
      <div className="space-y-6">
        {true && <WebsiteCrawlSetting />}
        <KnowledgeBankSetting />
      </div>
    </>
  );
};

export default KnowledgeSetting;
