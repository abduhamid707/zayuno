import assert from 'node:assert/strict';
import {
  getDynamicServiceMessage,
  getWelcomeMessage,
  computeAvailableServiceCount,
  formatCustomerStatus,
  formatCustomerQuote,
  formatCustomerActionConfirmation,
  formatCustomerActionStatus,
  formatCustomerActionCancellation,
  formatCustomerGeneralHelp,
  isDemoOrSandboxProvider,
  formatUzbekCurrency
} from '../packages/shared/src/customer-presenter.ts';
import { ZAYUNO_MCP_TOOLS } from '../apps/mcp/src/tools.ts';
import { ZAYUNO_MCP_PROMPTS } from '../apps/mcp/src/server.ts';

async function main() {
  console.log('🧪 Running Customer Experience & Presenter Tests...');

  // 1. 7 ta faol offering -> "Bir qancha yo‘nalishlarda..."
  {
    const msg7 = getDynamicServiceMessage(7);
    assert.equal(msg7, 'Bir qancha yo‘nalishlarda yordam bera olaman.');
    const welcome7 = getWelcomeMessage(7);
    assert.match(welcome7, /Zayuno sizga uzoqni yaqin qiladi/);
    assert.match(welcome7, /Bir qancha yo‘nalishlarda yordam bera olaman\./);
  }

  // 2. 45 ta -> "O‘nlab..."
  {
    const msg45 = getDynamicServiceMessage(45);
    assert.equal(msg45, 'O‘nlab xizmatlar orasidan sizga mosini topib beraman.');
    const welcome45 = getWelcomeMessage(45);
    assert.match(welcome45, /O‘nlab xizmatlar orasidan sizga mosini topib beraman\./);
  }

  // 3. 154 ta -> "100 dan oshiq..."
  {
    const msg154 = getDynamicServiceMessage(154);
    assert.equal(msg154, '100 dan oshiq xizmat orasidan sizga mosini topib beraman.');
  }

  // 4. 742 ta -> "700 dan oshiq..." (and 350, 1500, 6000 buckets)
  {
    const msg742 = getDynamicServiceMessage(742);
    assert.equal(msg742, '700 dan oshiq xizmat orasidan sizga mosini topib beraman.');

    const msg350 = getDynamicServiceMessage(350);
    assert.equal(msg350, '300 dan oshiq xizmat orasidan sizga mosini topib beraman.');

    const msg1500 = getDynamicServiceMessage(1500);
    assert.equal(msg1500, 'Minglab xizmatlar orasidan sizga mosini topib beraman.');

    const msg6000 = getDynamicServiceMessage(6000);
    assert.equal(msg6000, 'Minglab xizmat va takliflar orasidan sizga mosini topib beraman.');
  }

  // 5. sandbox/demo offeringlar countga kirmaydi
  {
    const providers = [
      // Published active real provider with 25 offerings
      {
        slug: 'toshkent-express',
        status: 'ACTIVE',
        adapterType: 'rest',
        metadata: {
          reviewStatus: 'APPROVED',
          isPublished: true,
          isCertified: true,
          catalogSummary: { availableCount: 25 }
        }
      },
      // Published active real provider with 12 offerings
      {
        slug: 'fast-courier',
        status: 'ACTIVE',
        adapterType: 'rest',
        metadata: {
          reviewStatus: 'APPROVED',
          isPublished: true,
          isCertified: true,
          readinessSnapshot: { availableOfferingsCount: 12 }
        }
      },
      // Sandbox provider (must NOT be counted)
      {
        slug: 'sandbox-provider',
        status: 'ACTIVE',
        adapterType: 'sandbox',
        metadata: {
          reviewStatus: 'APPROVED',
          isPublished: true,
          isCertified: true,
          sandbox: true,
          catalogSummary: { availableCount: 999 }
        }
      },
      // Demo provider (must NOT be counted)
      {
        slug: 'mock-poyez',
        status: 'SANDBOX',
        adapterType: 'mock',
        metadata: {
          reviewStatus: 'APPROVED',
          isPublished: true,
          isCertified: true,
          isDemo: true,
          catalogSummary: { availableCount: 500 }
        }
      },
      // Uncertified / unpublished provider (must NOT be counted)
      {
        slug: 'draft-provider',
        status: 'DRAFT',
        metadata: {
          reviewStatus: 'DRAFT',
          isPublished: false,
          isCertified: false,
          catalogSummary: { availableCount: 100 }
        }
      }
    ];

    const totalAvailable = computeAvailableServiceCount(providers);
    assert.equal(totalAvailable, 37, 'Only real published offerings (25 + 12 = 37) should be counted.');
    assert.equal(getDynamicServiceMessage(totalAvailable), 'O‘nlab xizmatlar orasidan sizga mosini topib beraman.');
  }

  // 6. stale/unknown count raqamsiz matn beradi
  {
    assert.equal(getDynamicServiceMessage(null), 'Bir qancha yo‘nalishlarda yordam bera olaman.');
    assert.equal(getDynamicServiceMessage(undefined), 'Bir qancha yo‘nalishlarda yordam bera olaman.');
    assert.equal(getDynamicServiceMessage(0), 'Bir qancha yo‘nalishlarda yordam bera olaman.');
    assert.equal(getDynamicServiceMessage(154, true), 'Bir qancha yo‘nalishlarda yordam bera olaman.'); // isStale = true
  }

  // 7. quote customer copy
  {
    // 7a. Train ticket quote
    const ticketQuote = {
      id: 'quote_train_123',
      fulfillmentType: 'DIGITAL_TICKET',
      subtotal: 118000,
      total: 118000,
      currency: 'UZS',
      parameters: {
        origin: 'Toshkent Janubiy',
        destination: 'Guliston',
        date: 'Bugun',
        departureTime: '16:00',
        carClass: 'Platskart',
        carNumber: 10,
        seatLevel: 'LOWER',
        selectedSeatNumbers: [1]
      }
    };
    const ticketCopy = formatCustomerQuote(ticketQuote, { type: 'TICKETING' });
    assert.match(ticketCopy, /^Chipta topildi:/);
    assert.match(ticketCopy, /Toshkent Janubiy → Guliston/);
    assert.match(ticketCopy, /Bugun, 16:00/);
    assert.match(ticketCopy, /Platskart, 10-vagon, pastki 1-joy/);
    assert.match(ticketCopy, /Jami: 118 000 so‘m/);
    assert.match(ticketCopy, /Shu chiptani band qilaymi\?$/);

    // 7b. General / food quote
    const foodQuote = {
      id: 'quote_food_456',
      fulfillmentType: 'DELIVERY',
      subtotal: 118000,
      totalFees: 15000,
      total: 133000,
      currency: 'UZS',
      lines: [
        { title: 'X Set', quantity: 2, unitPrice: 59000, lineTotal: 118000 }
      ]
    };
    const foodCopy = formatCustomerQuote(foodQuote);
    assert.match(foodCopy, /Buyurtma hisob-kitobi:/);
    assert.match(foodCopy, /X Set × 2 — 118 000 so‘m/);
    assert.match(foodCopy, /Yetkazib berish \/ xizmat haqi: 15 000 so‘m/);
    assert.match(foodCopy, /Jami: 133 000 so‘m/);
    assert.match(foodCopy, /Buyurtmani tasdiqlaysizmi\?/);
  }

  // 8. confirmation customer copy
  {
    const ticketAction = {
      id: 'act_ticket_789',
      fulfillmentType: 'DIGITAL_TICKET',
      paymentUrl: 'https://poyez-sandbox.shopla.uz/pay/ps_789',
      parameters: { trainNumber: '006F' }
    };
    const confirmCopy = formatCustomerActionConfirmation(ticketAction, { type: 'TICKETING' });
    assert.match(confirmCopy, /^Chipta band qilindi\. Endi to‘lovni yakunlang:/);
    assert.match(confirmCopy, /\[To‘lov sahifasini ochish\]\(https:\/\/poyez-sandbox\.shopla\.uz\/pay\/ps_789\)/);
  }

  // 9. unpaid customer copy
  {
    const unpaidTicket = {
      id: 'act_ticket_unpaid',
      fulfillmentType: 'DIGITAL_TICKET',
      status: 'AWAITING_PAYMENT',
      paymentStatus: 'PENDING',
      paymentUrl: 'https://poyez-sandbox.shopla.uz/pay/ps_unpaid',
      parameters: { trainNumber: '006F' }
    };
    const unpaidCopy = formatCustomerActionStatus(unpaidTicket, { type: 'TICKETING' });
    assert.match(unpaidCopy, /^Chipta band qilingan, lekin to‘lov hali qilinmagan\./);
    assert.match(unpaidCopy, /\[To‘lovni yakunlash\]\(https:\/\/poyez-sandbox\.shopla\.uz\/pay\/ps_unpaid\)/);
  }

  // 10. paid customer copy
  {
    const paidTicket = {
      id: 'act_ticket_paid',
      fulfillmentType: 'DIGITAL_TICKET',
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      parameters: { trainNumber: '006F' }
    };
    const paidCopy = formatCustomerActionStatus(paidTicket, { type: 'TICKETING' });
    assert.equal(paidCopy, 'Zo‘r, to‘lov qabul qilindi. Chiptangiz tasdiqlandi.');

    const paidFood = {
      id: 'act_food_paid',
      fulfillmentType: 'DELIVERY',
      status: 'CONFIRMED',
      paymentStatus: 'PAID'
    };
    const paidFoodCopy = formatCustomerActionStatus(paidFood);
    assert.equal(paidFoodCopy, 'To‘lov qabul qilindi. Buyurtmangiz tasdiqlandi.');
  }

  // 11. cancelled customer copy
  {
    const cancelledTicket = {
      id: 'act_ticket_canc',
      fulfillmentType: 'DIGITAL_TICKET',
      status: 'CANCELLED',
      parameters: { trainNumber: '006F' }
    };
    const cancelledCopy = formatCustomerActionStatus(cancelledTicket, { type: 'TICKETING' });
    assert.equal(cancelledCopy, 'Bu buyurtma bekor qilingan. Xohlasangiz, sizga yangi chipta topib beraman.');

    const cancelledCancelRes = formatCustomerActionCancellation({}, { type: 'TICKETING' });
    assert.equal(cancelledCancelRes, 'Bu buyurtma bekor qilingan. Xohlasangiz, sizga yangi chipta topib beraman.');
  }

  // 12. demo va real provider copy farqi
  {
    const demoProvider = {
      slug: 'mock-poyez',
      adapterType: 'sandbox',
      metadata: { sandbox: true }
    };
    const demoAction = {
      id: 'act_demo_1',
      fulfillmentType: 'DIGITAL_TICKET',
      paymentUrl: 'https://poyez-sandbox.shopla.uz/pay/ps_demo',
      parameters: { trainNumber: '006F' }
    };
    const demoConfirm = formatCustomerActionConfirmation(demoAction, demoProvider);
    assert.match(demoConfirm, /Bu demo buyurtma, haqiqiy to‘lov olinmaydi\./);
    assert.match(demoConfirm, /\[To‘lov sahifasini ochish\]/);

    const realProvider = {
      slug: 'railway-uz',
      adapterType: 'rest',
      metadata: { reviewStatus: 'APPROVED', isPublished: true, isCertified: true }
    };
    const realAction = {
      id: 'act_real_1',
      fulfillmentType: 'DIGITAL_TICKET',
      paymentUrl: 'https://railway.uz/pay/action_123',
      parameters: { trainNumber: '006F' }
    };
    const realConfirm = formatCustomerActionConfirmation(realAction, realProvider);
    assert.doesNotMatch(realConfirm, /demo/i);
    assert.doesNotMatch(realConfirm, /sandbox/i);
    assert.match(realConfirm, /^Chipta band qilindi\. Endi to‘lovni yakunlang:\n\n\[To‘lov sahifasini ochish\]/);
  }

  // 13. raw status/action ID/telefon/email customer outputga chiqmasligi
  {
    const rawAction = {
      id: 'ZY-SANDBOX-98421',
      publicId: 'ZY-SANDBOX-98421',
      status: 'AWAITING_PAYMENT',
      paymentStatus: 'PENDING',
      customer: {
        name: 'Ali Valiyev',
        phone: '+998901234567',
        email: 'ali@example.com'
      },
      paymentUrl: 'https://zayuno.uz/pay/ps_clean',
      parameters: { trainNumber: '006F' }
    };

    const quoteText = formatCustomerQuote({
      id: 'quote_raw_123',
      total: 118000,
      parameters: {
        origin: 'Toshkent Janubiy',
        destination: 'Guliston',
        departureTime: '16:00',
        customerPhone: '+998901234567'
      }
    }, { type: 'TICKETING' });

    const confirmText = formatCustomerActionConfirmation(rawAction, { type: 'TICKETING' });
    const statusText = formatCustomerActionStatus(rawAction, { type: 'TICKETING' });
    const generalHelp = formatCustomerGeneralHelp();

    const allCustomerTexts = [quoteText, confirmText, statusText, generalHelp].join('\n');

    // Forbidden developer/internal tokens:
    assert.doesNotMatch(allCustomerTexts, /AWAITING_PAYMENT/);
    assert.doesNotMatch(allCustomerTexts, /PENDING_CONFIRMATION/);
    assert.doesNotMatch(allCustomerTexts, /ZY-SANDBOX-98421/);
    assert.doesNotMatch(allCustomerTexts, /quote_raw_123/);
    assert.doesNotMatch(allCustomerTexts, /\+998901234567/);
    assert.doesNotMatch(allCustomerTexts, /ali@example\.com/);
    assert.doesNotMatch(allCustomerTexts, /webhook/i);
    assert.doesNotMatch(allCustomerTexts, /idempotency/i);
    assert.doesNotMatch(allCustomerTexts, /mcp/i);
  }

  // 14. Missing ticket fields -> no invented route/time/seat
  {
    const emptyTicketQuote = {
      id: 'quote_empty_ticket',
      fulfillmentType: 'DIGITAL_TICKET',
      total: 50000,
      currency: 'UZS',
      parameters: {}
    };
    const emptyTicketCopy = formatCustomerQuote(emptyTicketQuote, { type: 'TICKETING' });

    assert.match(emptyTicketCopy, /^Chipta topildi:/);
    assert.match(emptyTicketCopy, /Tafsilotlar checkout sahifasida tasdiqlanadi\./);
    assert.match(emptyTicketCopy, /Jami: 50 000 so‘m/);
    assert.match(emptyTicketCopy, /Shu chiptani band qilaymi\?$/);

    // Ensure NO fabricated/default fallback data is present:
    assert.doesNotMatch(emptyTicketCopy, /Toshkent/);
    assert.doesNotMatch(emptyTicketCopy, /Guliston/);
    assert.doesNotMatch(emptyTicketCopy, /16:00/);
    assert.doesNotMatch(emptyTicketCopy, /Platskart/);
    assert.doesNotMatch(emptyTicketCopy, /vagon/);
    assert.doesNotMatch(emptyTicketCopy, /joy/);
  }

  // 15. Partial ticket fields -> only provided fields are shown
  {
    const partialTicketQuote = {
      id: 'quote_partial_ticket',
      fulfillmentType: 'DIGITAL_TICKET',
      total: 85000,
      currency: 'UZS',
      parameters: {
        origin: 'Samarqand',
        destination: 'Buxoro'
      }
    };
    const partialCopy = formatCustomerQuote(partialTicketQuote, { type: 'TICKETING' });

    assert.match(partialCopy, /Samarqand → Buxoro/);
    assert.match(partialCopy, /Jami: 85 000 so‘m/);
    assert.match(partialCopy, /Shu chiptani band qilaymi\?$/);

    // No fabricated time or seat:
    assert.doesNotMatch(partialCopy, /Toshkent/);
    assert.doesNotMatch(partialCopy, /Guliston/);
    assert.doesNotMatch(partialCopy, /16:00/);
    assert.doesNotMatch(partialCopy, /Platskart/);
    assert.doesNotMatch(partialCopy, /vagon/);
    assert.doesNotMatch(partialCopy, /joy/);
    assert.doesNotMatch(partialCopy, /Tafsilotlar/);
  }

  // 16. Physical provider without active locations is NOT counted
  {
    const physicalProviderNoLoc = {
      slug: 'delivery-no-loc',
      type: 'DELIVERY',
      status: 'ACTIVE',
      adapterType: 'rest',
      metadata: {
        reviewStatus: 'APPROVED',
        isPublished: true,
        isCertified: true,
        catalogSummary: { availableCount: 50 },
        activeLocationsCount: 0
      },
      locations: []
    };

    const physicalCount = computeAvailableServiceCount([physicalProviderNoLoc]);
    assert.equal(physicalCount, 0, 'Physical delivery provider without active locations must NOT be counted.');
    assert.equal(getDynamicServiceMessage(physicalCount), 'Bir qancha yo‘nalishlarda yordam bera olaman.');
  }

  // 17. get_welcome_message MCP tool handler returns customerMessage and matches dynamic API welcomeMessage
  {
    const welcomeTool = ZAYUNO_MCP_TOOLS.find(t => t.name === 'get_welcome_message');
    assert.ok(welcomeTool, 'get_welcome_message tool must be registered.');

    const mockDynamicInfo = {
      customerMessage: getWelcomeMessage(154),
      welcomeMessage: getWelcomeMessage(154),
      availableServiceCount: 154,
      dynamicServiceMessage: getDynamicServiceMessage(154)
    };

    const mockClient = {
      getWelcome: async () => mockDynamicInfo
    } as any;

    const result = await welcomeTool.handler({}, mockClient);
    assert.ok(result.customerMessage, 'customerMessage must be present in get_welcome_message response.');
    assert.equal(result.customerMessage, mockDynamicInfo.welcomeMessage, 'customerMessage must equal dynamic API welcomeMessage.');
    assert.equal(result.availableServiceCount, 154);
    assert.equal(result.dynamicServiceMessage, '100 dan oshiq xizmat orasidan sizga mosini topib beraman.');
  }

  // 18. get_welcome_message API error fallback
  {
    const welcomeTool = ZAYUNO_MCP_TOOLS.find(t => t.name === 'get_welcome_message');
    assert.ok(welcomeTool);

    const failingClient = {
      getWelcome: async () => {
        throw new Error('API network failure');
      }
    } as any;

    const fallbackResult = await welcomeTool.handler({}, failingClient);
    assert.ok(fallbackResult.customerMessage, 'customerMessage must be present on API error.');
    assert.match(fallbackResult.customerMessage, /Bir qancha yo‘nalishlarda yordam bera olaman\./);
    assert.doesNotMatch(fallbackResult.customerMessage, /O‘nlab/);
    assert.equal(fallbackResult.availableServiceCount, null);
    assert.equal(fallbackResult.dynamicServiceMessage, 'Bir qancha yo‘nalishlarda yordam bera olaman.');
  }

  // 19. Hardcoded "O‘nlab" is not used in static instructions
  {
    const instructionPrompt = ZAYUNO_MCP_PROMPTS.find(p => p.name === 'customer_assistant_instructions');
    assert.ok(instructionPrompt);
    const instructionText = instructionPrompt.messages[0].content.text;
    assert.doesNotMatch(instructionText, /O‘nlab xizmatlar orasidan sizga mosini topib beraman\./);
    assert.match(instructionText, /HAR DOIM get_welcome_message toolini chaqirib/);
    assert.match(instructionText, /customerMessage/);
  }

  console.log('✅ All Customer Experience & Presenter tests passed!');
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

