"use client";

import KnowledgeBankSetting from "./knowledgeBankSetting";
import WebsiteCrawlSetting from "./websiteCrawlSetting";

const KnowledgeSetting = () => {
  return (
    <>
      <div className="space-y-6">
        <WebsiteCrawlSetting />
        <KnowledgeBankSetting />
      </div>
    </>
  );
};

export default KnowledgeSetting;
