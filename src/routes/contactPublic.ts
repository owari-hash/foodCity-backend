import express, { Request, Response } from "express";
import { ContactSubmission } from "../models/ContactSubmission.js";
import { sendContactSubmissionSMS } from "../services/smsService.js";

export const contactPublicRouter = express.Router();

/**
 * POST /api/v1/contact/submit
 * Submit a contact form
 */
contactPublicRouter.post("/submit", async (req: Request, res: Response) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validation
    if (!phone || !message) {
      return res.status(400).json({
        error: "Missing required fields: phone, message",
      });
    }

    // Email validation (only if provided)
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
    }

    // Phone validation (basic)
    const phoneRegex = /^\+?[0-9\s\-()]{7,}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: "Invalid phone format" });
    }

    // Create submission record
    const submission = new ContactSubmission({
      name: name?.trim(),
      email: email?.trim().toLowerCase(),
      phone: phone.trim(),
      subject: subject?.trim(),
      message: message.trim(),
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    await submission.save();

    // Send SMS notifications to admins using configured settings
    await sendContactSubmissionSMS({
      name,
      phone,
      email,
      subject,
    });

    return res.status(201).json({
      success: true,
      message: "Contact submission received. We will get back to you soon.",
      submissionId: submission._id,
    });
  } catch (error) {
    console.error("Contact submission error:", error);
    return res.status(500).json({
      error: "Failed to submit contact form",
    });
  }
});

/**
 * GET /api/v1/contact/submissions
 * Get all contact submissions (admin only - requires auth)
 */
contactPublicRouter.get("/submissions", async (req: Request, res: Response) => {
  try {
    // TODO: Add authentication middleware
    const submissions = await ContactSubmission.find()
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

/**
 * PATCH /api/v1/contact/submissions/:id/status
 * Update submission status (admin only)
 */
contactPublicRouter.patch(
  "/submissions/:id/status",
  async (req: Request, res: Response) => {
    try {
      // TODO: Add authentication middleware
      const { id } = req.params;
      const { status } = req.body;

      if (!["new", "read", "responded"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const submission = await ContactSubmission.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );

      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      return res.json({
        success: true,
        submission,
      });
    } catch (error) {
      console.error("Error updating submission:", error);
      return res.status(500).json({ error: "Failed to update submission" });
    }
  }
);
