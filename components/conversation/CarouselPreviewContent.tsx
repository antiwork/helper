import FileSaver from "file-saver";
import { Download } from "lucide-react";
import PreviewModal from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/previewModal";
import type { AttachedFile } from "@/app/types/global";
import { CarouselDirection, createCarousel } from "@/components/carousel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const { Carousel, CarouselButton, CarouselContext } = createCarousel<AttachedFile>();

interface CarouselPreviewContentProps {
  previewFileIndex: number;
  setPreviewFileIndex: (index: number) => void;
  previewFiles: AttachedFile[];
  setPreviewFiles: (files: AttachedFile[]) => void;
}

export const CarouselPreviewContent = ({
  previewFileIndex,
  setPreviewFileIndex,
  previewFiles,
  setPreviewFiles,
}: CarouselPreviewContentProps) => {
  return (
    <CarouselContext.Provider
      value={{
        currentIndex: previewFileIndex,
        setCurrentIndex: setPreviewFileIndex,
        items: previewFiles,
      }}
    >
      <Carousel>
        {(currentFile) => (
          <Dialog open={!!currentFile} onOpenChange={(open) => !open && setPreviewFiles([])}>
            <DialogContent className="max-w-5xl">
              <DialogHeader>
                <DialogTitle>File Preview</DialogTitle>
              </DialogHeader>
              <div className="relative bottom-0.5 flex items-center justify-between p-3">
                <div className="max-w-xs truncate" title={currentFile.name}>
                  {currentFile.name}
                </div>

                <div className="mr-6 flex items-center">
                  <button
                    onClick={() =>
                      currentFile.presignedUrl && FileSaver.saveAs(currentFile.presignedUrl, currentFile.name)
                    }
                  >
                    <Download className="text-primary h-5 w-5 shrink-0" />
                    <span className="sr-only">Download</span>
                  </button>
                </div>
              </div>

              <div className="relative flex flex-row items-center justify-center gap-3">
                <CarouselButton direction={CarouselDirection.LEFT} className="absolute -left-10 md:-left-11" />
                <PreviewModal file={currentFile} />
                <CarouselButton direction={CarouselDirection.RIGHT} className="absolute -right-10 md:-right-11" />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </Carousel>
    </CarouselContext.Provider>
  );
};