/**
 * aurora-skills
 *
 * Aurora-specific skills that the channel-router agent can dispatch.
 * Each skill is a typed async function. The engine calls them after
 * the ConfirmationGate approves (for irreversible actions).
 *
 * Skills:
 *   makeCall          — places a phone call to a contact
 *   sendSMS           — sends an SMS to a contact
 *   addMedicationReminder — schedules a medication reminder
 *   getEmergencyContacts  — returns the user's emergency contacts
 *   describeImage     — runs Claude Vision on an image file
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Contact, Medication, MemoryPlugin } from '@aurora/memory-plugin';

// ── Types ──────────────────────────────────────────────────────────────────

export interface CallResult {
  success: boolean;
  contactName: string;
  phone: string;
  /** Platform-specific call ID for tracking */
  callId?: string;
  error?: string;
}

export interface SmsResult {
  success: boolean;
  contactName: string;
  phone: string;
  messageId?: string;
  error?: string;
}

export interface MedicationReminderResult {
  success: boolean;
  medication: Medication;
  nextReminder?: string;
  error?: string;
}

export interface ImageDescriptionResult {
  description: string;
  /** Confidence level (0–1) that the description is useful */
  confidence: number;
  error?: string;
}

// ── makeCall ───────────────────────────────────────────────────────────────

/**
 * Places a phone call to a named contact from the user's profile.
 *
 * TODO: integrate a real telephony provider:
 *   - Twilio: client.calls.create({ to, from, url })
 *   - Vonage / Plivo as alternatives
 *   Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in env.
 */
export async function makeCall(
  userId: string,
  contactNameOrPhone: string,
  memory: MemoryPlugin
): Promise<CallResult> {
  const profile = await memory.getProfile(userId);
  if (!profile) return { success: false, contactName: contactNameOrPhone, phone: '', error: 'Profile not found' };

  const contact = findContact(profile.contacts, contactNameOrPhone);
  if (!contact?.phone) {
    return { success: false, contactName: contactNameOrPhone, phone: '', error: 'Contact not found or has no phone number' };
  }

  // TODO: place real call via Twilio SDK
  console.log(`[makeCall stub] Calling ${contact.name} at ${contact.phone}`);

  return { success: true, contactName: contact.name, phone: contact.phone, callId: 'stub-call-id' };
}

// ── sendSMS ────────────────────────────────────────────────────────────────

/**
 * Sends an SMS to a named contact.
 *
 * TODO: integrate Twilio Messages API:
 *   client.messages.create({ to, from, body })
 */
export async function sendSMS(
  userId: string,
  contactNameOrPhone: string,
  message: string,
  memory: MemoryPlugin
): Promise<SmsResult> {
  const profile = await memory.getProfile(userId);
  if (!profile) return { success: false, contactName: contactNameOrPhone, phone: '', error: 'Profile not found' };

  const contact = findContact(profile.contacts, contactNameOrPhone);
  if (!contact?.phone) {
    return { success: false, contactName: contactNameOrPhone, phone: '', error: 'Contact not found or has no phone number' };
  }

  // TODO: send real SMS via Twilio SDK
  console.log(`[sendSMS stub] Sending to ${contact.name} (${contact.phone}): "${message}"`);

  return { success: true, contactName: contact.name, phone: contact.phone, messageId: 'stub-msg-id' };
}

// ── addMedicationReminder ──────────────────────────────────────────────────

/**
 * Adds a medication reminder to the user's profile and schedules notifications.
 *
 * TODO: wire up a cron/scheduler (node-cron or system-level scheduler) to
 *       fire push notifications at each reminderTime.
 */
export async function addMedicationReminder(
  userId: string,
  name: string,
  dosage: string,
  reminderTimes: string[],
  memory: MemoryPlugin,
  instructions?: string
): Promise<MedicationReminderResult> {
  try {
    const med = await memory.addMedication(userId, {
      name,
      dosage,
      reminderTimes,
      instructions,
      active: true,
    });

    // TODO: register each reminderTime with a scheduler service
    const nextReminder = reminderTimes[0];

    return { success: true, medication: med, nextReminder };
  } catch (err) {
    return { success: false, medication: {} as Medication, error: String(err) };
  }
}

// ── getEmergencyContacts ───────────────────────────────────────────────────

/** Returns the user's emergency contacts — used by the emergency protocol */
export async function getEmergencyContacts(
  userId: string,
  memory: MemoryPlugin
): Promise<Contact[]> {
  return memory.getEmergencyContacts(userId);
}

// ── describeImage ──────────────────────────────────────────────────────────

/**
 * Uses Claude Vision to describe the contents of an image for the user.
 *
 * TODO: add image validation (file size limit, allowed MIME types) before
 *       sending to the API to avoid unnecessary billing.
 */
export async function describeImage(
  imagePath: string,
  prompt = 'Describe what you see in this image clearly for an elderly person. Be concise.'
): Promise<ImageDescriptionResult> {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const { readFileSync } = await import('node:fs');

    const imageData = readFileSync(imagePath);
    const base64 = imageData.toString('base64');
    // TODO: detect MIME type dynamically (e.g. via file-type package)
    const mediaType = 'image/jpeg';

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: prompt },
        ],
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return { description: text, confidence: 0.9 };
  } catch (err) {
    return { description: '', confidence: 0, error: String(err) };
  }
}

// ── Private helpers ────────────────────────────────────────────────────────

function findContact(contacts: Contact[], nameOrPhone: string): Contact | undefined {
  const q = nameOrPhone.toLowerCase();
  return contacts.find(
    (c) => c.name.toLowerCase().includes(q) || c.phone === nameOrPhone
  );
}
