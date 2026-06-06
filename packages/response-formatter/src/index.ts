/**
 * response-formatter
 *
 * Formats agent responses for Aurora's display layer.
 * Supports three output modes:
 *   text  — plain text for screen display
 *   voice — SSML-annotated string for TTS engines
 *   both  — produces both representations
 *
 * 60+ UX rules applied:
 *   - Limit to 3 sentences per response to avoid cognitive overload
 *   - Strip markdown (bold, italics, links) from the text version
 *   - Wrap SSML with a slow prosody rate for the voice version
 *   - Append action hints (e.g. "Di SÍ o NO") for confirmation prompts
 */

export type OutputMode = 'text' | 'voice' | 'both';

export interface FormattedResponse {
  mode: OutputMode;
  /** Plain text version — always populated */
  text: string;
  /** SSML string for TTS — populated when mode is 'voice' or 'both' */
  ssml?: string;
  /** Hint for the UI layer on font size / accessibility rendering */
  uiHint?: {
    fontSize: 'normal' | 'large' | 'x-large';
    highContrast: boolean;
  };
}

export class ResponseFormatter {
  /**
   * Formats an agent response string into a FormattedResponse.
   *
   * @param response  Raw agent text (may contain markdown)
   * @param mode      Desired output mode
   * @param fontSize  Font size preference from the user profile
   * @param voiceSpeed  TTS rate from the user profile (0.8 = 80% of normal)
   *
   * TODO: integrate a real SSML validator to catch malformed tags before
   *       sending to the TTS engine (e.g. Google TTS / Azure Cognitive).
   */
  format(
    response: string,
    mode: OutputMode,
    fontSize: 'normal' | 'large' | 'x-large' = 'large',
    voiceSpeed: number = 0.85
  ): FormattedResponse {
    const plain = this.toPlainText(response);
    const truncated = this.truncateToSentences(plain, 3);

    const result: FormattedResponse = {
      mode,
      text: truncated,
      uiHint: { fontSize, highContrast: fontSize !== 'normal' },
    };

    if (mode === 'voice' || mode === 'both') {
      result.ssml = this.toSsml(truncated, voiceSpeed);
    }

    return result;
  }

  /** Strips markdown formatting from agent output */
  private toPlainText(text: string): string {
    return text
      .replace(/SKILL_CALL:\s*\{[\s\S]*?\}\s*$/m, '') // remove inline skill directives
      .replace(/\*\*(.+?)\*\*/g, '$1')                 // bold
      .replace(/\*(.+?)\*/g, '$1')                     // italic
      .replace(/__(.+?)__/g, '$1')                     // bold alt
      .replace(/`(.+?)`/g, '$1')                       // inline code
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')              // links
      .replace(/#{1,6}\s/g, '')                        // headings
      .replace(/>\s/g, '')                             // blockquotes
      .trim();
  }

  /** Keeps only the first N sentences to avoid cognitive overload */
  private truncateToSentences(text: string, maxSentences: number): string {
    // TODO: use an NLP sentence tokenizer for more accurate splitting,
    //       especially for Spanish text with abbreviations (Sr., Dra., etc.)
    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
    return sentences.slice(0, maxSentences).join(' ').trim();
  }

  /** Wraps plain text in SSML with Aurora's preferred voice settings */
  private toSsml(text: string, rate: number): string {
    const ratePercent = `${Math.round(rate * 100)}%`;
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    // TODO: add <emphasis> tags around key words detected via NLP
    // TODO: add <break time="500ms"/> after commas for more natural pacing
    return `<speak><prosody rate="${ratePercent}">${escaped}</prosody></speak>`;
  }
}
