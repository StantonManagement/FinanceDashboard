import { useState } from "react";
import { cn } from "@/lib/utils";
import CommentModal from "./comment-modal";

interface CellComment {
  id: string;
  commentNumber: string;
  commentType: "ACCOUNTING" | "PROPERTY_MANAGEMENT" | "EXTERNAL";
}

interface ClickableCellProps {
  children: React.ReactNode;
  cellReference: string;
  cellValue: string;
  tabSection: string;
  propertyCode: string;
  className?: string;
  comments?: CellComment[];
  onCommentAdded?: (comment: any) => void;
}

export default function ClickableCell({
  children,
  cellReference,
  cellValue,
  tabSection,
  propertyCode,
  className,
  comments = [],
  onCommentAdded
}: ClickableCellProps) {
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const hasComments = comments.length > 0;
  const accountingComments = comments.filter(c => c.commentType === "ACCOUNTING");
  const pmComments = comments.filter(c => c.commentType === "PROPERTY_MANAGEMENT");
  const externalComments = comments.filter(c => c.commentType === "EXTERNAL");

  // Visual styling based on comment types
  const getCellStyling = () => {
    if (externalComments.length > 0) {
      // External/Lender comments get numbered badges
      return "relative";
    } else if (accountingComments.length > 0) {
      // Accounting comments get yellow highlighting
      return "bg-yellow-100 hover:bg-yellow-200";
    } else if (pmComments.length > 0) {
      // PM comments get blue highlighting
      return "bg-blue-100 hover:bg-blue-200";
    } else if (isHovered) {
      // Hover state for uncommented cells
      return "bg-gray-50";
    }
    return "";
  };

  const handleCellClick = () => {
    setShowCommentModal(true);
  };

  const handleCommentCreated = (comment: any) => {
    if (onCommentAdded) {
      onCommentAdded(comment);
    }
  };

  return (
    <>
      <td
        className={cn(
          "cursor-pointer transition-colors duration-150 relative",
          getCellStyling(),
          className
        )}
        onClick={handleCellClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={hasComments ? `${comments.length} comment(s) - Click to add another` : "Click to add comment"}
      >
        {children}
        
        {/* External/Lender comment badges (numbered) */}
        {externalComments.length > 0 && (
          <div className="absolute -top-1 -right-1 flex flex-wrap gap-1">
            {externalComments.slice(0, 3).map((comment) => (
              <span
                key={comment.id}
                className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full border border-white"
              >
                {comment.commentNumber.split('-')[1]}
              </span>
            ))}
            {externalComments.length > 3 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-gray-600 rounded-full border border-white">
                +{externalComments.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Internal comment indicators (accounting/PM - highlighting only) */}
        {(accountingComments.length > 0 || pmComments.length > 0) && externalComments.length === 0 && (
          <div className="absolute top-1 right-1">
            <span className="inline-flex items-center justify-center w-3 h-3 bg-institutional-black rounded-full">
              <span className="text-[8px] text-white font-bold">
                {accountingComments.length + pmComments.length}
              </span>
            </span>
          </div>
        )}

        {/* Hover indicator for uncommented cells */}
        {!hasComments && isHovered && (
          <div className="absolute top-1 right-1">
            <span className="inline-flex items-center justify-center w-3 h-3 bg-gray-400 rounded-full">
              <span className="text-[8px] text-white font-bold">+</span>
            </span>
          </div>
        )}
      </td>

      <CommentModal
        open={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        cellReference={cellReference}
        cellValue={cellValue}
        tabSection={tabSection}
        propertyCode={propertyCode}
        onCommentCreated={handleCommentCreated}
      />
    </>
  );
}