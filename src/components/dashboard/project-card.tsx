import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-simple";
import { Button } from "@/components/ui/button";
import { ExternalLink, Pencil } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ProjectCardProps {
  id: string;
  name: string;
  status: "draft" | "published" | "archived";
  type: string;
  updatedAt: Date | string;
  thumbnailGradient?: string;
}

const statusVariant = {
  draft: "secondary" as const,
  published: "brand" as const,
  archived: "outline" as const,
};

export function ProjectCard({
  id,
  name,
  status,
  type,
  updatedAt,
  thumbnailGradient = "from-brand/20 via-purple-500/10 to-blue-500/10",
}: ProjectCardProps) {
  return (
    <Card className="overflow-hidden card-hover group">
      <div
        className={`h-36 bg-gradient-to-br ${thumbnailGradient} relative flex items-center justify-center border-b`}
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/5 dark:bg-white/5" />
        <span className="text-5xl opacity-20 select-none" aria-hidden="true">
          {type.charAt(0)}
        </span>
      </div>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold truncate">{name}</h3>
          <Badge variant={statusVariant[status]} className="shrink-0 capitalize">
            {status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {type.replace(/_/g, " ")} · Edited {formatDate(updatedAt, "en-US")}
        </p>
      </CardContent>
      <CardFooter className="p-4 pt-0 gap-2">
        <Button variant="brand" size="sm" className="flex-1" asChild>
          <Link href={`/editor/${id}`}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Edit
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/preview/${id}`} target="_blank">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">Preview</span>
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
