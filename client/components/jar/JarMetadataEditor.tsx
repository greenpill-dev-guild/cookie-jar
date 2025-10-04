"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface JarMetadataEditorProps {
	isEditingMetadata: boolean;
	setIsEditingMetadata: (editing: boolean) => void;
	editName: string;
	setEditName: (name: string) => void;
	editImage: string;
	setEditImage: (image: string) => void;
	editLink: string;
	setEditLink: (link: string) => void;
	editDescription: string;
	setEditDescription: (description: string) => void;
	onSave: () => void;
	isUpdatingMetadata: boolean;
}

export function JarMetadataEditor({
	isEditingMetadata,
	setIsEditingMetadata,
	editName,
	setEditName,
	editImage,
	setEditImage,
	editLink,
	setEditLink,
	editDescription,
	setEditDescription,
	onSave,
	isUpdatingMetadata,
}: JarMetadataEditorProps) {
	if (!isEditingMetadata) return null;

	return (
		<Dialog open={isEditingMetadata} onOpenChange={setIsEditingMetadata}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Edit Jar Information</DialogTitle>
					<DialogDescription>
						Update the name, image, link, and description for your cookie jar.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="edit-name">Jar Name</Label>
						<Input
							id="edit-name"
							value={editName}
							onChange={(e) => setEditName(e.target.value)}
							placeholder="My Cookie Jar"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="edit-image">Image URL (Optional)</Label>
						<Input
							id="edit-image"
							value={editImage}
							onChange={(e) => setEditImage(e.target.value)}
							placeholder="https://example.com/image.png"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="edit-link">External Link (Optional)</Label>
						<Input
							id="edit-link"
							value={editLink}
							onChange={(e) => setEditLink(e.target.value)}
							placeholder="https://yourwebsite.com"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="edit-description">Description (Optional)</Label>
						<Textarea
							id="edit-description"
							value={editDescription}
							onChange={(e) => setEditDescription(e.target.value)}
							placeholder="Additional information about your jar"
							className="min-h-20"
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => setIsEditingMetadata(false)}>
						Cancel
					</Button>
					<Button
						onClick={onSave}
						disabled={isUpdatingMetadata}
						className="bg-[#ff5e14] hover:bg-[#e54d00] text-white"
					>
						{isUpdatingMetadata && (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						)}
						{isUpdatingMetadata ? "Saving..." : "Save Changes"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
