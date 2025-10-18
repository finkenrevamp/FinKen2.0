# Journal Entry Attachments Setup

## Overview
Journal entries can now include file attachments (PDF, Word, Excel, CSV, JPG, PNG) that are uploaded to Supabase Storage.

## Supabase Storage Bucket Setup

You need to create a storage bucket in your Supabase project to store journal entry attachments.

### Steps to Create the Bucket:

1. **Go to Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project (ozzzoedpddtrwdbwrrqs)

2. **Create Storage Bucket**
   - Go to Storage section in the left sidebar
   - Click "Create a new bucket"
   - Bucket name: `journal-attachments`
   - Make it **private** (not public) for security
   - Click "Create bucket"

3. **Set Bucket Policies**
   Add the following policies to allow authenticated users to upload and view files:

   **Policy for Upload (INSERT):**
   ```sql
   CREATE POLICY "Authenticated users can upload attachments"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'journal-attachments');
   ```

   **Policy for View (SELECT):**
   ```sql
   CREATE POLICY "Authenticated users can view attachments"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (bucket_id = 'journal-attachments');
   ```

   **Policy for Delete (DELETE) - Optional:**
   ```sql
   CREATE POLICY "Authenticated users can delete their attachments"
   ON storage.objects FOR DELETE
   TO authenticated
   USING (bucket_id = 'journal-attachments');
   ```

4. **Verify Configuration**
   - Bucket name in code: `journal-attachments`
   - The bucket should appear in the Supabase Storage dashboard
   - Test by creating a journal entry with attachments

## File Upload Specifications

### Allowed File Types:
- **PDF**: `.pdf`
- **Word**: `.doc`, `.docx`
- **Excel**: `.xls`, `.xlsx`
- **CSV**: `.csv`
- **Images**: `.jpg`, `.jpeg`, `.png`

### File Storage Structure:
```
journal-attachments/
  ├── {journal_entry_id}/
  │   ├── {uuid}.pdf
  │   ├── {uuid}.xlsx
  │   └── {uuid}.png
  └── ...
```

Each journal entry has its own folder (by ID), and files are stored with unique UUIDs to prevent naming conflicts.

## Database Schema

The `journalattachments` table stores metadata about uploaded files:

```sql
CREATE TABLE public.journalattachments (
  AttachmentID bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  JournalEntryID bigint NOT NULL,
  FileName text NOT NULL,
  FilePath text NOT NULL,
  FileType text,
  FileSize bigint,
  UploadedByUserID uuid NOT NULL,
  UploadTimestamp timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT journalattachments_pkey PRIMARY KEY (AttachmentID),
  CONSTRAINT journalattachments_JournalEntryID_fkey FOREIGN KEY (JournalEntryID) REFERENCES public.journalentries(JournalEntryID),
  CONSTRAINT journalattachments_UploadedByUserID_fkey FOREIGN KEY (UploadedByUserID) REFERENCES public.profiles(id)
);
```

## Usage

### Creating a Journal Entry with Attachments:

1. Click "New Entry" button on the Journalize page
2. Fill in entry information:
   - Entry Date (required)
   - Entry Type (Regular or Adjusting)
   - Description (optional)
3. Add account lines (at least one debit and one credit):
   - Select account from dropdown
   - Enter amount
   - Debits must equal credits
4. Attach files (optional):
   - Click "Add Files" button
   - Select one or more files
   - Files will be uploaded when the entry is created
5. Click "Create Entry"

### Viewing Attachments:

- Click on any journal entry row in the table
- The details dialog will show all attachments
- File information includes name, type, size, and uploader

## API Endpoints

### Create Journal Entry with Attachments
```
POST /api/journal-entries
Content-Type: multipart/form-data

Form fields:
- entry_date: string (YYYY-MM-DD)
- description: string (optional)
- is_adjusting_entry: boolean
- lines: JSON string (array of account lines)
- files: File[] (optional, multiple files)
```

### Response:
```json
{
  "journal_entry_id": 123,
  "entry_date": "2025-10-18",
  "description": "Sample entry",
  "status": "Pending",
  "is_adjusting_entry": false,
  "lines": [...],
  "attachments": [
    {
      "attachment_id": 1,
      "file_name": "receipt.pdf",
      "file_size": 102400,
      "file_type": "application/pdf",
      ...
    }
  ]
}
```

## Troubleshooting

### Files not uploading?
1. Check that the `journal-attachments` bucket exists in Supabase Storage
2. Verify storage policies are set correctly
3. Check that `SUPABASE_SERVICE_KEY` is set in backend/.env
4. Look for errors in browser console or backend logs

### Permission denied errors?
- Make sure the storage bucket policies are correctly configured
- Verify the user is authenticated
- Check that the bucket name in code matches the actual bucket name

### File size limits?
- Supabase has a default file size limit (check your plan)
- Frontend doesn't enforce a size limit, but you can add one if needed
- Backend will fail gracefully if upload fails

## Security Considerations

1. **Private Bucket**: The bucket should be private to prevent unauthorized access
2. **Authentication Required**: Only authenticated users can upload/view files
3. **File Type Validation**: Both frontend and backend validate file types
4. **Unique Filenames**: UUIDs prevent filename collisions and path traversal attacks
5. **Database Records**: All uploads are tracked in the database with user attribution

## Future Enhancements

Potential improvements:
- Add file download functionality
- Implement file preview for images and PDFs
- Add file size limits and validation
- Support for deleting attachments
- Compression for images
- Virus scanning for uploaded files
