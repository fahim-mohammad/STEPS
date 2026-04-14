# Quick File Placement Guide

## Two Files to Add

### 1. Background Image
**What**: Your background image file  
**Name**: `bg.jpg`  
**Format**: JPG or PNG  
**Size**: Recommended 2560x1440px or larger (16:9 aspect ratio)  
**Where**: `/public/bg.jpg`  
**Exact Path**: `/Users/apple/Downloads/steps-fund-management/public/bg.jpg`

**To Place**:
```bash
# Copy your background image to the public folder
cp ~/your-background-image.jpg ~/Downloads/steps-fund-management/public/bg.jpg
```

---

### 2. Contract PDF
**What**: STEPS Fund Agreement contract  
**Name**: `steps-fund-agreement.pdf`  
**Format**: PDF (convert from the Word document)  
**Where**: `/public/contracts/steps-fund-agreement.pdf`  
**Exact Path**: `/Users/apple/Downloads/steps-fund-management/public/contracts/steps-fund-agreement.pdf`

**To Create & Place**:
1. Open `STEPS_Fund_Agreement.docx` in Microsoft Word or Google Docs
2. Click "File" → "Export As" or "Download"
3. Select "PDF" format
4. Save as: `steps-fund-agreement.pdf`
5. Move to the folder:
   ```bash
   cp ~/Downloads/steps-fund-agreement.pdf ~/Downloads/steps-fund-management/public/contracts/
   ```

---

## Directory Structure After Adding Files

```
steps-fund-management/
├── public/
│   ├── bg.jpg                           ← ADD THIS
│   ├── contracts/
│   │   └── steps-fund-agreement.pdf     ← ADD THIS
│   ├── stepslogo.png
│   ├── background.jpeg
│   └── ... (other assets)
├── app/
│   ├── contract/
│   │   └── page.tsx                     ← CREATED: contract page
│   ├── dashboard/
│   │   └── page.tsx
│   ├── globals.css                      ← MODIFIED: background image CSS
│   └── layout.tsx
└── ... (other files)
```

---

## Verification

After adding both files, test:

1. **Background Image**: 
   - Visit any page (e.g., `http://localhost:3001/`)
   - Should see your background image with dark overlay
   - Works on all pages (persistent background)

2. **Contract PDF**:
   - Visit `http://localhost:3001/contract`
   - "Download PDF" button should be active
   - Click button should download the PDF

3. **Dashboard Integration**:
   - Visit `http://localhost:3001/dashboard`
   - Click "View Contract" button in Quick Actions
   - Should navigate to `/contract` page

---

## File Sizes Guide

- **Background image**: Typically 500KB - 3MB depending on quality
- **Contract PDF**: Typically 100KB - 500KB depending on formatting

---

## Troubleshooting

### Background not showing
- ❓ Did you save the image as `bg.jpg`?
- ❓ Is it in `/public/` folder directly?
- ❓ Try refreshing the page (Ctrl+R or Cmd+R)
- ❓ Check browser console for 404 errors

### PDF download not working
- ❓ Did you convert the Word doc to PDF?
- ❓ Is the file named exactly `steps-fund-agreement.pdf`?
- ❓ Is it in `/public/contracts/` folder?
- ❓ Did you refresh the page after adding the file?

---

## Next Steps

1. ✅ Prepare your `bg.jpg` file
2. ✅ Convert `STEPS_Fund_Agreement.docx` to PDF
3. ✅ Place both files in their folders (as shown above)
4. ✅ Refresh your browser
5. ✅ Done! Everything will work

---

**File Placement Date**: February 3, 2025
