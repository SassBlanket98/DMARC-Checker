// email_auth_wizard.js - Interactive email authentication setup wizard

import {
  initHistoryHandler,
  loadHistoryFromStorage,
} from "./modules/history.js";
import { initModals } from "./modules/modals.js";
import { initNavigation, setupNavResizeHandler } from "./modules/navigation.js";
import { showToast } from "./modules/toast.js";
import {
  isMobileDevice,
  initMobileEnhancements,
  enhanceModalsForMobile,
  enhanceMobileToast,
} from "./mobile-enhancements.js";

// Provider-specific configuration and setup instructions
const providerConfig = {
  google: {
    name: "Google Workspace / Gmail",
    spf: {
      record: "v=spf1 include:_spf.google.com ~all",
      instructions: `
        <p>Google Workspace (formerly G Suite) requires specific SPF records to ensure your domain's emails are properly authenticated.</p>
      `,
      steps: `
        <h4>How to add SPF for Google Workspace:</h4>
        <ol>
          <li>Log in to your domain registrar or DNS provider</li>
          <li>Navigate to your domain's DNS settings</li>
          <li>Add a new TXT record with the following settings:
            <ul>
              <li><strong>Host/Name:</strong> @ (or leave blank, depending on your provider)</li>
              <li><strong>Type:</strong> TXT</li>
              <li><strong>Value/Content:</strong> v=spf1 include:_spf.google.com ~all</li>
              <li><strong>TTL:</strong> 3600 (or 1 hour)</li>
            </ul>
          </li>
          <li>Save your changes</li>
          <li>Note: If you already have an SPF record, you'll need to modify it instead of creating a new one. SPF records must be combined into a single record.</li>
        </ol>
      `,
    },
    dkim: {
      instructions: `
        <p>Google Workspace uses DKIM to digitally sign your emails. Here's how to set up DKIM with Google:</p>
      `,
      steps: `
        <h4>How to set up DKIM for Google Workspace:</h4>
        <ol>
          <li>Log in to your <a href="https://admin.google.com" target="_blank">Google Workspace Admin Console</a></li>
          <li>Go to Apps → Google Workspace → Gmail → Authenticate email</li>
          <li>Select your domain from the list</li>
          <li>Click "Generate new record"</li>
          <li>Choose a prefix (the default is "google")</li>
          <li>Click "Generate"</li>
          <li>Google will provide you with a DKIM TXT record to add to your DNS</li>
          <li>Add this record to your DNS provider:
            <ul>
              <li><strong>Host/Name:</strong> [prefix]._domainkey (e.g., google._domainkey)</li>
              <li><strong>Type:</strong> TXT</li>
              <li><strong>Value/Content:</strong> The TXT record Google provided</li>
              <li><strong>TTL:</strong> 3600 (or 1 hour)</li>
            </ul>
          </li>
          <li>After adding the record, go back to the Google Admin Console and click "Start authentication"</li>
        </ol>
      `,
      selector: "google",
    },
  },
  microsoft: {
    name: "Microsoft 365 / Exchange",
    spf: {
      record: "v=spf1 include:spf.protection.outlook.com -all",
      instructions: `
        <p>Microsoft 365 (formerly Office 365) requires specific SPF records to ensure your domain's emails are properly authenticated.</p>
      `,
      steps: `
        <h4>How to add SPF for Microsoft 365:</h4>
        <ol>
          <li>Log in to your domain registrar or DNS provider</li>
          <li>Navigate to your domain's DNS settings</li>
          <li>Add a new TXT record with the following settings:
            <ul>
              <li><strong>Host/Name:</strong> @ (or leave blank, depending on your provider)</li>
              <li><strong>Type:</strong> TXT</li>
              <li><strong>Value/Content:</strong> v=spf1 include:spf.protection.outlook.com -all</li>
              <li><strong>TTL:</strong> 3600 (or 1 hour)</li>
            </ul>
          </li>
          <li>Save your changes</li>
          <li>Note: If you already have an SPF record, you'll need to modify it instead of creating a new one. SPF records must be combined into a single record.</li>
        </ol>
      `,
    },
    dkim: {
      instructions: `
        <p>Microsoft 365 uses DKIM to digitally sign your emails. Here's how to set up DKIM with Microsoft 365:</p>
      `,
      steps: `
        <h4>How to set up DKIM for Microsoft 365:</h4>
        <ol>
          <li>Log in to the <a href="https://admin.microsoft.com" target="_blank">Microsoft 365 admin center</a></li>
          <li>Go to Settings → Domains</li>
          <li>Select your domain</li>
          <li>Click on "DNS records" and select "Advanced DNS" tab</li>
          <li>Scroll down to the DKIM section and enable DKIM signing</li>
          <li>Microsoft will provide you with two CNAME records to add to your DNS</li>
          <li>Add these records to your DNS provider:
            <ul>
              <li>First record:
                <ul>
                  <li><strong>Host/Name:</strong> selector1._domainkey</li>
                  <li><strong>Type:</strong> CNAME</li>
                  <li><strong>Value/Content:</strong> selector1-[domain]-[onmicrosoft-domain]</li>
                  <li><strong>TTL:</strong> 3600 (or 1 hour)</li>
                </ul>
              </li>
              <li>Second record:
                <ul>
                  <li><strong>Host/Name:</strong> selector2._domainkey</li>
                  <li><strong>Type:</strong> CNAME</li>
                  <li><strong>Value/Content:</strong> selector2-[domain]-[onmicrosoft-domain]</li>
                  <li><strong>TTL:</strong> 3600 (or 1 hour)</li>
                </ul>
              </li>
            </ul>
          </li>
          <li>After adding the records, wait 24-48 hours, then go back to the Microsoft 365 admin center and enable DKIM signing</li>
        </ol>
      `,
      selector: "selector1",
    },
  },
  zoho: {
    name: "Zoho Mail",
    spf: {
      record: "v=spf1 include:zoho.com ~all",
      instructions: `
        <p>Zoho Mail requires specific SPF records to ensure your domain's emails are properly authenticated.</p>
      `,
      steps: `
        <h4>How to add SPF for Zoho Mail:</h4>
        <ol>
          <li>Log in to your domain registrar or DNS provider</li>
          <li>Navigate to your domain's DNS settings</li>
          <li>Add a new TXT record with the following settings:
            <ul>
              <li><strong>Host/Name:</strong> @ (or leave blank, depending on your provider)</li>
              <li><strong>Type:</strong> TXT</li>
              <li><strong>Value/Content:</strong> v=spf1 include:zoho.com ~all</li>
              <li><strong>TTL:</strong> 3600 (or 1 hour)</li>
            </ul>
          </li>
          <li>Save your changes</li>
          <li>Note: If you already have an SPF record, you'll need to modify it instead of creating a new one. SPF records must be combined into a single record.</li>
        </ol>
      `,
    },
    dkim: {
      instructions: `
        <p>Zoho Mail uses DKIM to digitally sign your emails. Here's how to set up DKIM with Zoho Mail:</p>
      `,
      steps: `
        <h4>How to set up DKIM for Zoho Mail:</h4>
        <ol>
          <li>Log in to your <a href="https://controlpanel.zoho.com" target="_blank">Zoho Control Panel</a></li>
          <li>Navigate to Mail → Domain Connections</li>
          <li>Click on your domain</li>
          <li>Select "Email Authentication" tab</li>
          <li>Click "Enable" next to DKIM</li>
          <li>Zoho will provide you with a DKIM TXT record</li>
          <li>Add this record to your DNS provider:
            <ul>
              <li><strong>Host/Name:</strong> zoho._domainkey</li>
              <li><strong>Type:</strong> TXT</li>
              <li><strong>Value/Content:</strong> The TXT record Zoho provided</li>
              <li><strong>TTL:</strong> 3600 (or 1 hour)</li>
            </ul>
          </li>
          <li>After adding the record, go back to the Zoho Control Panel and verify your DKIM setup</li>
        </ol>
      `,
      selector: "zoho",
    },
  },
  amazon: {
    name: "Amazon SES",
    spf: {
      record: "v=spf1 include:amazonses.com ~all",
      instructions: `
        <p>Amazon SES (Simple Email Service) requires specific SPF records to ensure your domain's emails are properly authenticated.</p>
      `,
      steps: `
        <h4>How to add SPF for Amazon SES:</h4>
        <ol>
          <li>Log in to your domain registrar or DNS provider</li>
          <li>Navigate to your domain's DNS settings</li>
          <li>Add a new TXT record with the following settings:
            <ul>
              <li><strong>Host/Name:</strong> @ (or leave blank, depending on your provider)</li>
              <li><strong>Type:</strong> TXT</li>
              <li><strong>Value/Content:</strong> v=spf1 include:amazonses.com ~all</li>
              <li><strong>TTL:</strong> 3600 (or 1 hour)</li>
            </ul>
          </li>
          <li>Save your changes</li>
          <li>Note: If you already have an SPF record, you'll need to modify it instead of creating a new one. SPF records must be combined into a single record.</li>
        </ol>
      `,
    },
    dkim: {
      instructions: `
        <p>Amazon SES uses DKIM to digitally sign your emails. Here's how to set up DKIM with Amazon SES:</p>
      `,
      steps: `
        <h4>How to set up DKIM for Amazon SES:</h4>
        <ol>
          <li>Log in to your <a href="https://console.aws.amazon.com/ses" target="_blank">AWS Management Console</a> and open the SES console</li>
          <li>In the navigation pane, choose "Verified identities"</li>
          <li>Select your domain</li>
          <li>On the Authentication tab, go to the DKIM section and choose "Easy DKIM"</li>
          <li>Click "Enable" or "Edit" to configure DKIM</li>
          <li>Choose a DKIM key length (2048-bit recommended) and note the DKIM selector</li>
          <li>Amazon will provide you with three CNAME records to add to your DNS</li>
          <li>Add these records to your DNS provider exactly as specified by Amazon</li>
          <li>Wait for the DNS changes to propagate (this can take 24-48 hours)</li>
          <li>SES will automatically verify the DKIM configuration once DNS propagation is complete</li>
        </ol>
      `,
      selector: "amazonses",
    },
  },
  mailchimp: {
    name: "Mailchimp",
    spf: {
      record: "v=spf1 include:servers.mcsv.net ~all",
      instructions: `
        <p>Mailchimp requires specific SPF records to ensure your domain's emails are properly authenticated.</p>
      `,
      steps: `
        <h4>How to add SPF for Mailchimp:</h4>
        <ol>
          <li>Log in to your domain registrar or DNS provider</li>
          <li>Navigate to your domain's DNS settings</li>
          <li>Add a new TXT record with the following settings:
            <ul>
              <li><strong>Host/Name:</strong> @ (or leave blank, depending on your provider)</li>
              <li><strong>Type:</strong> TXT</li>
              <li><strong>Value/Content:</strong> v=spf1 include:servers.mcsv.net ~all</li>
              <li><strong>TTL:</strong> 3600 (or 1 hour)</li>
            </ul>
          </li>
          <li>Save your changes</li>
          <li>Note: If you already have an SPF record, you'll need to modify it instead of creating a new one. SPF records must be combined into a single record.</li>
        </ol>
      `,
    },
    dkim: {
      instructions: `
        <p>Mailchimp uses DKIM to digitally sign your emails. Here's how to set up DKIM with Mailchimp:</p>
      `,
      steps: `
        <h4>How to set up DKIM for Mailchimp:</h4>
        <ol>
          <li>Log in to your <a href="https://admin.mailchimp.com" target="_blank">Mailchimp account</a></li>
          <li>Go to Audience → Settings → Domains</li>
          <li>Click "Authenticate Domain"</li>
          <li>Enter your domain name and click "Generate DKIM Keys"</li>
          <li>Mailchimp will provide you with DKIM records to add to your DNS</li>
          <li>Add these records to your DNS provider as specified by Mailchimp</li>
          <li>After adding the records, go back to Mailchimp and click "Verify"</li>
          <li>Mailchimp will verify your DKIM setup</li>
        </ol>
      `,
      selector: "k1",
    },
  },
  sendgrid: {
    name: "SendGrid",
    spf: {
      record: "v=spf1 include:sendgrid.net ~all",
      instructions: `
        <p>SendGrid requires specific SPF records to ensure your domain's emails are properly authenticated.</p>
      `,
      steps: `
        <h4>How to add SPF for SendGrid:</h4>
        <ol>
          <li>Log in to your domain registrar or DNS provider</li>
          <li>Navigate to your domain's DNS settings</li>
          <li>Add a new TXT record with the following settings:
            <ul>
              <li><strong>Host/Name:</strong> @ (or leave blank, depending on your provider)</li>
              <li><strong>Type:</strong> TXT</li>
              <li><strong>Value/Content:</strong> v=spf1 include:sendgrid.net ~all</li>
              <li><strong>TTL:</strong> 3600 (or 1 hour)</li>
            </ul>
          </li>
          <li>Save your changes</li>
          <li>Note: If you already have an SPF record, you'll need to modify it instead of creating a new one. SPF records must be combined into a single record.</li>
        </ol>
      `,
    },
    dkim: {
      instructions: `
        <p>SendGrid uses DKIM to digitally sign your emails. Here's how to set up DKIM with SendGrid:</p>
      `,
      steps: `
        <h4>How to set up DKIM for SendGrid:</h4>
        <ol>
          <li>Log in to your <a href="https://app.sendgrid.com" target="_blank">SendGrid account</a></li>
          <li>Go to Settings → Sender Authentication</li>
          <li>Click "Authenticate Domain"</li>
          <li>Enter your domain name and click "Next"</li>
          <li>SendGrid will provide you with several DNS records to add, including DKIM records</li>
          <li>Add all these records to your DNS provider as specified by SendGrid</li>
          <li>After adding the records, go back to SendGrid and click "Verify"</li>
          <li>SendGrid will verify your DKIM setup</li>
        </ol>
      `,
      selector: "s1",
    },
  },
  custom: {
    name: "Custom / Self-hosted",
    spf: {
      record: "v=spf1 mx ip4:YOUR_SERVER_IP -all",
      instructions: `
        <p>For self-hosted email servers, you'll need to create a custom SPF record that includes your server's IP address and other authorized sending sources.</p>
      `,
      steps: `
        <h4>How to add SPF for your self-hosted email server:</h4>
        <ol>
          <li>Identify your mail server's public IP address</li>
          <li>Log in to your domain registrar or DNS provider</li>
          <li>Navigate to your domain's DNS settings</li>
          <li>Add a new TXT record with the following settings:
            <ul>
              <li><strong>Host/Name:</strong> @ (or leave blank, depending on your provider)</li>
              <li><strong>Type:</strong> TXT</li>
              <li><strong>Value/Content:</strong> v=spf1 mx ip4:YOUR_SERVER_IP -all</li>
              <li><strong>TTL:</strong> 3600 (or 1 hour)</li>
            </ul>
          </li>
          <li>Replace YOUR_SERVER_IP with your actual server IP address</li>
          <li>Save your changes</li>
        </ol>
        <p>Notes:</p>
        <ul>
          <li>The "mx" mechanism includes all MX records in your domain as authorized senders</li>
          <li>You can add multiple IP addresses using additional ip4: entries</li>
          <li>For IPv6 addresses, use ip6: mechanism</li>
          <li>Use -all for strict enforcement (recommended) or ~all for soft fail mode</li>
        </ul>
      `,
    },
    dkim: {
      instructions: `
        <p>For self-hosted email servers, you'll need to generate your own DKIM keys and configure your mail server to sign outgoing emails.</p>
      `,
      steps: `
        <h4>How to set up DKIM for your self-hosted email server:</h4>
        <ol>
          <li>Generate a public/private key pair on your mail server (specific commands depend on your mail server software)</li>
          <li>Configure your mail server to sign outgoing emails with the private key</li>
          <li>Add a TXT record to your DNS settings with the public key:
            <ul>
              <li><strong>Host/Name:</strong> selector._domainkey (replace "selector" with your chosen name, e.g., "default")</li>
              <li><strong>Type:</strong> TXT</li>
              <li><strong>Value/Content:</strong> v=DKIM1; k=rsa; p=YOUR_PUBLIC_KEY</li>
              <li><strong>TTL:</strong> 3600 (or 1 hour)</li>
            </ul>
          </li>
          <li>Replace YOUR_PUBLIC_KEY with your actual public key</li>
          <li>Save your changes</li>
        </ol>
        <p>Common mail server configurations:</p>
        <ul>
          <li><strong>Postfix with OpenDKIM:</strong> Install opendkim package and follow configuration guide for your OS</li>
          <li><strong>Exim:</strong> Use DKIM feature in Exim 4.70 or later</li>
          <li><strong>Exchange Server:</strong> Use a third-party solution like DKIM Signer for Exchange</li>
        </ul>
      `,
      selector: "default",
    },
  },
  other: {
    name: "Other Provider",
    spf: {
      record: "v=spf1 include:_spf.example.com ~all",
      instructions: `
        <p>You'll need to check with your email provider for their specific SPF requirements. Below is a general guide to help you set up SPF for any provider.</p>
      `,
      steps: `
        <h4>How to add SPF for your email provider:</h4>
        <ol>
          <li>Contact your email provider or check their documentation to determine the correct SPF record to use</li>
          <li>Log in to your domain registrar or DNS provider</li>
          <li>Navigate to your domain's DNS settings</li>
          <li>Add a new TXT record with the following settings:
            <ul>
              <li><strong>Host/Name:</strong> @ (or leave blank, depending on your provider)</li>
              <li><strong>Type:</strong> TXT</li>
              <li><strong>Value/Content:</strong> v=spf1 include:[PROVIDER_SPF_DOMAIN] ~all</li>
              <li><strong>TTL:</strong> 3600 (or 1 hour)</li>
            </ul>
          </li>
          <li>Replace [PROVIDER_SPF_DOMAIN] with the domain provided by your email service</li>
          <li>Save your changes</li>
        </ol>
        <p>Note: If you already have an SPF record, you'll need to modify it instead of creating a new one. SPF records must be combined into a single record.</p>
      `,
    },
    dkim: {
      instructions: `
        <p>You'll need to check with your email provider for their specific DKIM setup requirements. Below is a general guide to help you set up DKIM for any provider.</p>
      `,
      steps: `
        <h4>How to set up DKIM for your email provider:</h4>
        <ol>
          <li>Contact your email provider or check their documentation for DKIM setup instructions</li>
          <li>Your provider will typically provide you with:
            <ul>
              <li>A DKIM selector name (e.g., "default", "mail", etc.)</li>
              <li>A TXT record value containing the public key</li>
            </ul>
          </li>
          <li>Log in to your domain registrar or DNS provider</li>
          <li>Navigate to your domain's DNS settings</li>
          <li>Add a new TXT record with the following settings:
            <ul>
              <li><strong>Host/Name:</strong> [SELECTOR]._domainkey</li>
              <li><strong>Type:</strong> TXT</li>
              <li><strong>Value/Content:</strong> The TXT record provided by your email provider</li>
              <li><strong>TTL:</strong> 3600 (or 1 hour)</li>
            </ul>
          </li>
          <li>Replace [SELECTOR] with the selector name provided by your email provider</li>
          <li>Save your changes</li>
          <li>After adding the record, follow your provider's instructions to verify or activate DKIM</li>
        </ol>
      `,
      selector: "default",
    },
  },
};

// Wizard state
let wizardState = {
  currentStep: 1,
  totalSteps: 7,
  provider: null,
  domain: "",
  records: {
    spf: {
      exists: false,
      value: "",
    },
    dkim: {
      exists: false,
      value: "",
      selector: "",
    },
    dmarc: {
      exists: false,
      value: "",
      policy: "none",
    },
  },
  reportEmail: "",
};

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  // Initialize core components
  initHistoryHandler();
  loadHistoryFromStorage();
  initModals();

  // Initialize navigation dropdown
  initNavigation();
  setupNavResizeHandler();

  // Set up wizard event listeners
  setupWizardEventListeners();

  // Apply theme preference
  applyThemePreference();

  // Mobile enhancements if needed
  if (isMobileDevice()) {
    initMobileEnhancements();
    enhanceModalsForMobile();
    enhanceMobileToast();
  }

  console.log("Email Authentication Wizard initialized!");
});

// Set up event listeners for wizard
function setupWizardEventListeners() {
  // Step 1: Introduction
  document
    .getElementById("start-wizard")
    .addEventListener("click", function () {
      goToStep(2);
    });

  // Step 2: Provider Selection
  const providerCards = document.querySelectorAll(".provider-card");
  providerCards.forEach((card) => {
    card.addEventListener("click", function () {
      const provider = this.getAttribute("data-provider");
      selectProvider(provider);
    });
  });

  document
    .getElementById("provider-next")
    .addEventListener("click", function () {
      if (!wizardState.provider) {
        showToast("Please select an email provider", "warning");
        return;
      }

      if (wizardState.provider === "other") {
        const otherProviderName = document
          .getElementById("other-provider-name")
          .value.trim();
        if (!otherProviderName) {
          showToast("Please specify your provider name", "warning");
          return;
        }
        providerConfig.other.name = otherProviderName;
      }

      goToStep(3);
    });

  // Step 3: Domain Input
  document
    .getElementById("check-domain-btn")
    .addEventListener("click", function () {
      const domain = document.getElementById("domain-input").value.trim();
      if (!domain) {
        showToast("Please enter a domain name", "warning");
        return;
      }

      if (!isValidDomain(domain)) {
        showToast("Please enter a valid domain format", "error");
        return;
      }

      wizardState.domain = domain;
      checkDomainRecords(domain);
    });

  document.getElementById("domain-next").addEventListener("click", function () {
    if (!wizardState.domain) {
      showToast("Please enter and check a domain first", "warning");
      return;
    }

    goToStep(4);
    updateProviderSpecificContent();
  });

  // Step 4: SPF Setup
  document
    .getElementById("copy-spf-btn")
    .addEventListener("click", function () {
      const spfRecord = document
        .getElementById("spf-record-box")
        .textContent.trim();
      copyToClipboard(spfRecord, this);
    });

  document
    .getElementById("verify-spf-btn")
    .addEventListener("click", function () {
      verifySPF(wizardState.domain);
    });

  // Step 5: DKIM Setup
  document
    .getElementById("verify-dkim-btn")
    .addEventListener("click", function () {
      const selector =
        document.getElementById("dkim-selector-input")?.value.trim() ||
        providerConfig[wizardState.provider]?.dkim?.selector ||
        "default";
      verifyDKIM(wizardState.domain, selector);
    });

  // Step 6: DMARC Setup
  const dmarcPolicyRadios = document.querySelectorAll(
    'input[name="dmarc-policy"]'
  );
  dmarcPolicyRadios.forEach((radio) => {
    radio.addEventListener("change", function () {
      wizardState.records.dmarc.policy = this.value;
      updateDmarcRecord();

      // Update visual selection
      document.querySelectorAll(".policy-option").forEach((option) => {
        option.classList.remove("selected");
      });

      const selectedOption = document.querySelector(
        `.policy-option[data-policy="${this.value}"]`
      );
      if (selectedOption) {
        selectedOption.classList.add("selected");
      }
    });
  });

  document
    .getElementById("dmarc-report-email")
    .addEventListener("input", function () {
      wizardState.reportEmail = this.value.trim();
      updateDmarcRecord();
    });

  document
    .getElementById("copy-dmarc-btn")
    .addEventListener("click", function () {
      const dmarcRecord = document
        .getElementById("dmarc-record-box")
        .textContent.trim();
      copyToClipboard(dmarcRecord, this);
    });

  document
    .getElementById("verify-dmarc-btn")
    .addEventListener("click", function () {
      verifyDMARC(wizardState.domain);
    });

  // Step 7: Verification & Completion
  document
    .getElementById("verify-all-btn")
    .addEventListener("click", function () {
      verifyAllRecords(wizardState.domain);
    });

  document
    .getElementById("finish-wizard")
    .addEventListener("click", function () {
      finishWizard();
    });

  // Back buttons
  const backButtons = document.querySelectorAll(".back-btn");
  backButtons.forEach((button, index) => {
    button.addEventListener("click", function () {
      goToStep(wizardState.currentStep - 1);
    });
  });

  // Next buttons
  const nextButtons = document.querySelectorAll(".next-btn");
  nextButtons.forEach((button, index) => {
    button.addEventListener("click", function () {
      if (this.id !== "provider-next" && this.id !== "domain-next") {
        goToStep(wizardState.currentStep + 1);

        // If moving to DKIM step, update provider-specific content
        if (wizardState.currentStep === 5) {
          updateProviderSpecificContent(true);
        }

        // If moving to DMARC step, update DMARC record
        if (wizardState.currentStep === 6) {
          updateDmarcRecord();
        }
      }
    });
  });
}

// Navigate to a specific step
function goToStep(step) {
  console.log(`Attempting to go to step ${step}`);

  if (step < 1 || step > wizardState.totalSteps) {
    console.log(`Invalid step: ${step}`);
    return;
  }

  // Hide all steps
  const steps = document.querySelectorAll(".wizard-step");
  steps.forEach((s) => {
    s.classList.remove("active");
  });

  // Show the target step
  const targetStep = document.getElementById(`step-${step}`);
  if (targetStep) {
    targetStep.classList.add("active");
    console.log(`Successfully navigated to step ${step}`);
  } else {
    console.error(`Step element with ID step-${step} not found!`);
  }

  // Update progress indicators
  updateProgress(step);

  // Update state
  wizardState.currentStep = step;
}

// Update progress bar and step indicators
function updateProgress(step) {
  // Calculate progress percentage
  const progressPercentage = ((step - 1) / (wizardState.totalSteps - 1)) * 100;

  // Update progress bar fill
  const progressFill = document.getElementById("progress-fill");
  if (progressFill) {
    progressFill.style.width = `${progressPercentage}%`;
  }

  // Update step indicators
  const progressSteps = document.querySelectorAll(".progress-step");
  progressSteps.forEach((s) => {
    const stepNum = parseInt(s.getAttribute("data-step"));
    s.classList.remove("active", "completed");

    if (stepNum === step) {
      s.classList.add("active");
    } else if (stepNum < step) {
      s.classList.add("completed");
    }
  });
}

// Handle provider selection
function selectProvider(provider) {
  // Update state
  wizardState.provider = provider;

  // Update UI to show selection
  const providerCards = document.querySelectorAll(".provider-card");
  providerCards.forEach((card) => {
    card.classList.remove("selected");
  });

  const selectedCard = document.querySelector(
    `.provider-card[data-provider="${provider}"]`
  );
  if (selectedCard) {
    selectedCard.classList.add("selected");
  }

  // Show/hide "other provider" input field
  const otherProviderInput = document.getElementById("other-provider-input");
  if (provider === "other") {
    otherProviderInput.classList.remove("hidden");
  } else {
    otherProviderInput.classList.add("hidden");
  }
}

// Check if domain is valid format
function isValidDomain(domain) {
  const domainRegex =
    /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

// Check domain records (SPF, DKIM, DMARC)
async function checkDomainRecords(domain) {
  // Show domain results container
  const domainResults = document.getElementById("domain-results");
  domainResults.classList.remove("hidden");

  // Reset status indicators to "checking"
  document.querySelector("#spf-status .status-indicator").innerHTML =
    '<i class="fas fa-circle-notch fa-spin"></i> Checking...';
  document.querySelector("#spf-status .status-indicator").className =
    "status-indicator status-pending";
  document.querySelector("#dkim-status .status-indicator").innerHTML =
    '<i class="fas fa-circle-notch fa-spin"></i> Checking...';
  document.querySelector("#dkim-status .status-indicator").className =
    "status-indicator status-pending";
  document.querySelector("#dmarc-status .status-indicator").innerHTML =
    '<i class="fas fa-circle-notch fa-spin"></i> Checking...';
  document.querySelector("#dmarc-status .status-indicator").className =
    "status-indicator status-pending";

  // Hide all details
  document.querySelectorAll(".record-details").forEach((el) => {
    el.classList.add("hidden");
  });

  try {
    // Check SPF
    const spfResponse = await fetch(
      `/api/spf?domain=${encodeURIComponent(domain)}`
    );
    const spfData = await spfResponse.json();
    updateRecordStatus("spf", spfData);

    // Check DKIM (this is more complex as we need to guess common selectors)
    const commonSelectors = [
      "google",
      "selector1",
      "default",
      "zoho",
      "mail",
      "dkim",
    ];
    const selectedProvider = wizardState.provider;
    if (selectedProvider && providerConfig[selectedProvider]?.dkim?.selector) {
      // Add provider-specific selector to the beginning of the list
      commonSelectors.unshift(providerConfig[selectedProvider].dkim.selector);
    }

    const dkimResponse = await fetch(
      `/api/dkim?domain=${encodeURIComponent(
        domain
      )}&selectors=${commonSelectors.join(",")}`
    );
    const dkimData = await dkimResponse.json();
    updateRecordStatus("dkim", dkimData);

    // Check DMARC
    const dmarcResponse = await fetch(
      `/api/dmarc?domain=${encodeURIComponent(domain)}`
    );
    const dmarcData = await dmarcResponse.json();
    updateRecordStatus("dmarc", dmarcData);
  } catch (error) {
    console.error("Error checking domain records:", error);
    showToast("Error checking domain records", "error");

    // Update all statuses to error
    updateRecordStatus("spf", { error: "Connection error" });
    updateRecordStatus("dkim", { error: "Connection error" });
    updateRecordStatus("dmarc", { error: "Connection error" });
  }
}

// Update record status in the UI
function updateRecordStatus(recordType, data) {
  const statusContainer = document.querySelector(
    `#${recordType}-status .status-indicator`
  );
  const detailsContainer = document.querySelector(
    `#${recordType}-status .record-details`
  );

  if (data.error) {
    // Handle error or record not found
    statusContainer.innerHTML = '<i class="fas fa-times-circle"></i> Not Found';
    statusContainer.className = "status-indicator status-error";

    if (detailsContainer) {
      detailsContainer.textContent = data.error;
      detailsContainer.classList.remove("hidden");
    }

    // Update wizard state
    wizardState.records[recordType].exists = false;
    wizardState.records[recordType].value = "";
  } else {
    // Record exists
    statusContainer.innerHTML = '<i class="fas fa-check-circle"></i> Found';
    statusContainer.className = "status-indicator status-success";

    // Update wizard state
    wizardState.records[recordType].exists = true;

    // Handle specific record types
    if (recordType === "spf" && data.spf_record) {
      wizardState.records.spf.value = data.spf_record;

      if (detailsContainer) {
        detailsContainer.textContent = data.spf_record;
        detailsContainer.classList.remove("hidden");
      }
    } else if (
      recordType === "dmarc" &&
      data.dmarc_records &&
      data.dmarc_records.length > 0
    ) {
      wizardState.records.dmarc.value = data.dmarc_records[0];

      // Extract policy if available
      if (data.parsed_record && data.parsed_record.p) {
        wizardState.records.dmarc.policy = data.parsed_record.p;
      }

      if (detailsContainer) {
        detailsContainer.textContent = data.dmarc_records[0];
        detailsContainer.classList.remove("hidden");
      }
    } else if (recordType === "dkim") {
      // Check if any valid DKIM record was found
      let foundValidDkim = false;
      let validSelector = "";
      let validRecord = "";

      for (const [selector, selectorData] of Object.entries(data)) {
        if (
          selector !== "overall_status" &&
          selector !== "recommendations" &&
          selector !== "suggestions"
        ) {
          if (
            selectorData.status === "success" &&
            selectorData.dkim_records &&
            selectorData.dkim_records.length > 0
          ) {
            foundValidDkim = true;
            validSelector = selector;
            validRecord = selectorData.dkim_records[0];
            break;
          }
        }
      }

      if (foundValidDkim) {
        wizardState.records.dkim.exists = true;
        wizardState.records.dkim.selector = validSelector;
        wizardState.records.dkim.value = validRecord;

        if (detailsContainer) {
          detailsContainer.textContent = `Selector: ${validSelector}, Record: ${validRecord}`;
          detailsContainer.classList.remove("hidden");
        }
      } else {
        statusContainer.innerHTML =
          '<i class="fas fa-times-circle"></i> Not Found';
        statusContainer.className = "status-indicator status-error";
        wizardState.records.dkim.exists = false;

        if (detailsContainer) {
          detailsContainer.textContent =
            "No valid DKIM records found with common selectors.";
          detailsContainer.classList.remove("hidden");
        }
      }
    }
  }
}

// Update provider-specific content
function updateProviderSpecificContent(isDkimStep = false) {
  const provider = wizardState.provider;
  if (!provider || !providerConfig[provider]) {
    return;
  }

  // Update provider name in headings
  document.getElementById("spf-provider-name").textContent =
    providerConfig[provider].name;
  document.getElementById("dkim-provider-name").textContent =
    providerConfig[provider].name;

  // Update SPF content
  if (!isDkimStep) {
    document.getElementById("spf-instructions").innerHTML =
      providerConfig[provider].spf.instructions;
    document.getElementById("spf-setup-steps").innerHTML =
      providerConfig[provider].spf.steps;

    // Generate SPF record box content
    let spfRecord = providerConfig[provider].spf.record;

    // If provider is custom, show placeholder for server IP
    if (provider === "custom") {
      spfRecord = spfRecord.replace("YOUR_SERVER_IP", "[YOUR-SERVER-IP]");
    }

    document.getElementById("spf-record-box").textContent = spfRecord;
  }

  // Update DKIM content if on DKIM step
  if (isDkimStep) {
    document.getElementById("dkim-instructions").innerHTML =
      providerConfig[provider].dkim.instructions;
    document.getElementById("dkim-setup-steps").innerHTML =
      providerConfig[provider].dkim.steps;

    // Show selector info for verification
    const selectorInfo = document.getElementById("dkim-selector-info");
    const selector = providerConfig[provider].dkim.selector || "default";

    selectorInfo.innerHTML = `
      <h4>DKIM Selector Information</h4>
      <p>Your DKIM selector for ${providerConfig[provider].name} is likely to be <strong>${selector}</strong>.</p>
      <p>When verifying your DKIM setup, use this selector or check your provider's documentation for the correct selector.</p>
    `;

    // Show selector input for verification if needed
    const selectorInputGroup = document.getElementById("selector-input-group");
    selectorInputGroup.classList.remove("hidden");

    const selectorInput = document.getElementById("dkim-selector-input");
    if (selectorInput) {
      selectorInput.value = selector;
    }
  }
}

// Update DMARC record
function updateDmarcRecord() {
  const policy = wizardState.records.dmarc.policy;
  const reportEmail = wizardState.reportEmail;

  let dmarcRecord = `v=DMARC1; p=${policy};`;

  // Add reporting URI if provided
  if (reportEmail) {
    dmarcRecord += ` rua=mailto:${reportEmail};`;
  }

  // Add additional recommended tags
  dmarcRecord += " adkim=r; aspf=r;";

  // Update record box
  document.getElementById("dmarc-record-box").textContent = dmarcRecord;

  // Update wizard state
  wizardState.records.dmarc.value = dmarcRecord;
}

// Verify SPF record
async function verifySPF(domain) {
  const verifyBtn = document.getElementById("verify-spf-btn");
  const resultContainer = document.getElementById("spf-verification-result");

  // Update button state
  verifyBtn.disabled = true;
  verifyBtn.innerHTML =
    '<i class="fas fa-circle-notch fa-spin"></i> Verifying...';

  try {
    // Call API to check SPF record
    const response = await fetch(
      `/api/spf?domain=${encodeURIComponent(domain)}`
    );
    const data = await response.json();

    // Show result container
    resultContainer.classList.remove("hidden");

    if (data.error) {
      resultContainer.innerHTML = `
        <div class="status-indicator status-error">
          <i class="fas fa-times-circle"></i> Verification Failed
        </div>
        <p>SPF record not found for your domain. Please add the SPF record as instructed above and try again.</p>
        <p>Error details: ${data.error}</p>
      `;
    } else {
      // Record exists, check if it matches recommended record
      const actualRecord = data.spf_record || "";
      const recommendedDomain = getRecommendedSpfDomain();

      if (actualRecord.includes(recommendedDomain)) {
        resultContainer.innerHTML = `
          <div class="status-indicator status-success">
            <i class="fas fa-check-circle"></i> Verification Successful
          </div>
          <p>Your SPF record is properly configured and includes the recommended settings for ${
            providerConfig[wizardState.provider].name
          }.</p>
          <p>Your current SPF record: <code>${actualRecord}</code></p>
        `;

        // Update wizard state
        wizardState.records.spf.exists = true;
        wizardState.records.spf.value = actualRecord;
      } else {
        resultContainer.innerHTML = `
          <div class="status-indicator status-warning">
            <i class="fas fa-exclamation-triangle"></i> Partial Configuration
          </div>
          <p>Your domain has an SPF record, but it doesn't include the recommended settings for ${
            providerConfig[wizardState.provider].name
          }.</p>
          <p>Your current SPF record: <code>${actualRecord}</code></p>
          <p>Make sure to include <code>${recommendedDomain}</code> in your SPF record.</p>
        `;
      }
    }
  } catch (error) {
    console.error("Error verifying SPF:", error);

    resultContainer.classList.remove("hidden");
    resultContainer.innerHTML = `
      <div class="status-indicator status-error">
        <i class="fas fa-times-circle"></i> Verification Error
      </div>
      <p>An error occurred while verifying your SPF record. Please try again later.</p>
    `;
  } finally {
    // Reset button state
    verifyBtn.disabled = false;
    verifyBtn.innerHTML =
      '<i class="fas fa-check-circle"></i> Verify SPF Setup';
  }
}

// Verify DKIM record
async function verifyDKIM(domain, selector) {
  const verifyBtn = document.getElementById("verify-dkim-btn");
  const resultContainer = document.getElementById("dkim-verification-result");

  // Update button state
  verifyBtn.disabled = true;
  verifyBtn.innerHTML =
    '<i class="fas fa-circle-notch fa-spin"></i> Verifying...';

  try {
    // Call API to check DKIM record
    const response = await fetch(
      `/api/dkim?domain=${encodeURIComponent(domain)}&selectors=${selector}`
    );
    const data = await response.json();

    // Show result container
    resultContainer.classList.remove("hidden");

    // Check if any valid DKIM record was found
    let foundValidDkim = false;
    let dkimSelector = "";
    let dkimRecord = "";

    // Process DKIM data
    for (const [key, value] of Object.entries(data)) {
      if (
        key !== "overall_status" &&
        key !== "recommendations" &&
        key !== "suggestions"
      ) {
        if (
          value.status === "success" &&
          value.dkim_records &&
          value.dkim_records.length > 0
        ) {
          foundValidDkim = true;
          dkimSelector = key;
          dkimRecord = value.dkim_records[0];
          break;
        }
      }
    }

    if (foundValidDkim) {
      resultContainer.innerHTML = `
        <div class="status-indicator status-success">
          <i class="fas fa-check-circle"></i> Verification Successful
        </div>
        <p>Your DKIM record for selector <strong>${dkimSelector}</strong> is properly configured.</p>
        <p>Record: <code>${dkimRecord}</code></p>
      `;

      // Update wizard state
      wizardState.records.dkim.exists = true;
      wizardState.records.dkim.selector = dkimSelector;
      wizardState.records.dkim.value = dkimRecord;
    } else {
      resultContainer.innerHTML = `
        <div class="status-indicator status-error">
          <i class="fas fa-times-circle"></i> Verification Failed
        </div>
        <p>No valid DKIM record found for selector <strong>${selector}</strong>.</p>
        <p>Please set up your DKIM record as instructed above and try again.</p>
        <p>Make sure you're using the correct selector for your email provider.</p>
      `;
    }
  } catch (error) {
    console.error("Error verifying DKIM:", error);

    resultContainer.classList.remove("hidden");
    resultContainer.innerHTML = `
      <div class="status-indicator status-error">
        <i class="fas fa-times-circle"></i> Verification Error
      </div>
      <p>An error occurred while verifying your DKIM record. Please try again later.</p>
    `;
  } finally {
    // Reset button state
    verifyBtn.disabled = false;
    verifyBtn.innerHTML =
      '<i class="fas fa-check-circle"></i> Verify DKIM Setup';
  }
}

// Verify DMARC record
async function verifyDMARC(domain) {
  const verifyBtn = document.getElementById("verify-dmarc-btn");
  const resultContainer = document.getElementById("dmarc-verification-result");

  // Update button state
  verifyBtn.disabled = true;
  verifyBtn.innerHTML =
    '<i class="fas fa-circle-notch fa-spin"></i> Verifying...';

  try {
    // Call API to check DMARC record
    const response = await fetch(
      `/api/dmarc?domain=${encodeURIComponent(domain)}`
    );
    const data = await response.json();

    // Show result container
    resultContainer.classList.remove("hidden");

    if (data.error) {
      resultContainer.innerHTML = `
        <div class="status-indicator status-error">
          <i class="fas fa-times-circle"></i> Verification Failed
        </div>
        <p>DMARC record not found for your domain. Please add the DMARC record as instructed above and try again.</p>
        <p>Error details: ${data.error}</p>
      `;
    } else if (data.dmarc_records && data.dmarc_records.length > 0) {
      // Record exists, check policy
      const actualRecord = data.dmarc_records[0];
      const policy = data.parsed_record?.p || "none";

      let statusClass = "status-success";
      let statusIcon = "check-circle";
      let statusText = "Verification Successful";
      let policyText = "";

      // Determine policy strength
      if (policy === "none") {
        policyText =
          "Your DMARC policy is set to <strong>monitoring only (p=none)</strong>. This is a good way to start, but consider strengthening it to quarantine or reject after monitoring for a period.";
      } else if (policy === "quarantine") {
        policyText =
          "Your DMARC policy is set to <strong>quarantine (p=quarantine)</strong>. This provides good protection by sending suspicious emails to the spam folder.";
      } else if (policy === "reject") {
        policyText =
          "Your DMARC policy is set to <strong>reject (p=reject)</strong>. This provides the strongest protection by rejecting suspicious emails.";
      }

      // Check if reporting is configured
      let reportingText = "";
      if (actualRecord.includes("rua=")) {
        reportingText =
          "Your DMARC record includes aggregate reporting (rua), which is recommended.";
      } else {
        reportingText =
          "Your DMARC record does not include aggregate reporting (rua). Consider adding it to receive reports about email authentication failures.";
        statusClass = "status-warning";
        statusIcon = "exclamation-triangle";
        statusText = "Partial Configuration";
      }

      resultContainer.innerHTML = `
        <div class="status-indicator ${statusClass}">
          <i class="fas fa-${statusIcon}"></i> ${statusText}
        </div>
        <p>Your DMARC record is configured.</p>
        <p>Current record: <code>${actualRecord}</code></p>
        <p>${policyText}</p>
        <p>${reportingText}</p>
      `;

      // Update wizard state
      wizardState.records.dmarc.exists = true;
      wizardState.records.dmarc.value = actualRecord;
      wizardState.records.dmarc.policy = policy;
    }
  } catch (error) {
    console.error("Error verifying DMARC:", error);

    resultContainer.classList.remove("hidden");
    resultContainer.innerHTML = `
      <div class="status-indicator status-error">
        <i class="fas fa-times-circle"></i> Verification Error
      </div>
      <p>An error occurred while verifying your DMARC record. Please try again later.</p>
    `;
  } finally {
    // Reset button state
    verifyBtn.disabled = false;
    verifyBtn.innerHTML =
      '<i class="fas fa-check-circle"></i> Verify DMARC Setup';
  }
}

// Verify all records
async function verifyAllRecords(domain) {
  const verifyBtn = document.getElementById("verify-all-btn");
  const resultContainer = document.getElementById(
    "complete-verification-result"
  );

  // Update button state
  verifyBtn.disabled = true;
  verifyBtn.innerHTML =
    '<i class="fas fa-circle-notch fa-spin"></i> Verifying...';

  try {
    // Call API to check all records
    const response = await fetch(
      `/api/overview?domain=${encodeURIComponent(domain)}`
    );
    const data = await response.json();

    // Show result container
    resultContainer.classList.remove("hidden");

    if (!data.records) {
      resultContainer.innerHTML = `
        <div class="status-indicator status-error">
          <i class="fas fa-times-circle"></i> Verification Failed
        </div>
        <p>An error occurred while fetching record information. Please try again later.</p>
      `;
      return;
    }

    // Process each record type
    const records = data.records;
    let spfStatus = "error";
    let dkimStatus = "error";
    let dmarcStatus = "error";

    // Check SPF
    const spfRecord = records.find((r) => r.title === "SPF");
    if (spfRecord && spfRecord.status === "success") {
      spfStatus = "success";
      // Update summary card
      updateSummaryCard("spf", "success", spfRecord.value.spf_record || "");
    } else {
      updateSummaryCard("spf", "error", "SPF record not properly configured");
    }

    // Check DKIM
    const dkimRecord = records.find((r) => r.title === "DKIM");
    if (dkimRecord && dkimRecord.status === "success") {
      dkimStatus = "success";
      // Find selector with valid record
      let validSelector = "";
      let validRecord = "";

      for (const [selector, data] of Object.entries(dkimRecord.value)) {
        if (
          selector !== "overall_status" &&
          selector !== "recommendations" &&
          selector !== "suggestions"
        ) {
          if (
            data.status === "success" &&
            data.dkim_records &&
            data.dkim_records.length > 0
          ) {
            validSelector = selector;
            validRecord = data.dkim_records[0];
            break;
          }
        }
      }

      if (validSelector) {
        updateSummaryCard("dkim", "success", `Selector: ${validSelector}`);
      } else {
        dkimStatus = "error";
        updateSummaryCard(
          "dkim",
          "error",
          "DKIM record not properly configured"
        );
      }
    } else {
      updateSummaryCard("dkim", "error", "DKIM record not properly configured");
    }

    // Check DMARC
    const dmarcRecord = records.find((r) => r.title === "DMARC");
    if (dmarcRecord && dmarcRecord.status === "success") {
      dmarcStatus = "success";
      const policy = dmarcRecord.value.parsed_record?.p || "none";
      updateSummaryCard("dmarc", "success", `Policy: ${policy}`);
    } else {
      updateSummaryCard(
        "dmarc",
        "error",
        "DMARC record not properly configured"
      );
    }

    // Calculate overall status
    const allSuccess =
      spfStatus === "success" &&
      dkimStatus === "success" &&
      dmarcStatus === "success";
    const someSuccess =
      spfStatus === "success" ||
      dkimStatus === "success" ||
      dmarcStatus === "success";

    let overallStatus = "";
    if (allSuccess) {
      overallStatus = `
        <div class="status-indicator status-success" style="display: inline-flex;">
          <i class="fas fa-check-circle"></i> Complete Setup
        </div>
        <p>Congratulations! Your domain has all three email authentication methods properly configured.</p>
        <p>Your emails are now better protected against spoofing and have improved deliverability.</p>
      `;
    } else if (someSuccess) {
      overallStatus = `
        <div class="status-indicator status-warning" style="display: inline-flex;">
          <i class="fas fa-exclamation-triangle"></i> Partial Setup
        </div>
        <p>Your domain has some email authentication methods configured, but not all three.</p>
        <p>For complete protection, please configure all missing components.</p>
      `;
    } else {
      overallStatus = `
        <div class="status-indicator status-error" style="display: inline-flex;">
          <i class="fas fa-times-circle"></i> Incomplete Setup
        </div>
        <p>Your domain does not have any email authentication methods properly configured.</p>
        <p>Please follow the instructions in this wizard to set up SPF, DKIM, and DMARC.</p>
      `;
    }

    // Update completion status
    document.getElementById("completion-status").innerHTML = overallStatus;

    // Generate verification result message
    resultContainer.innerHTML = `
      <div class="status-indicator ${
        allSuccess
          ? "status-success"
          : someSuccess
          ? "status-warning"
          : "status-error"
      }">
        <i class="fas fa-${
          allSuccess
            ? "check-circle"
            : someSuccess
            ? "exclamation-triangle"
            : "times-circle"
        }"></i> 
        ${
          allSuccess
            ? "All Records Verified"
            : someSuccess
            ? "Partial Verification"
            : "Verification Failed"
        }
      </div>
      <p>
        <strong>SPF:</strong> ${
          spfStatus === "success" ? "✓ Configured" : "✗ Not properly configured"
        }<br>
        <strong>DKIM:</strong> ${
          dkimStatus === "success"
            ? "✓ Configured"
            : "✗ Not properly configured"
        }<br>
        <strong>DMARC:</strong> ${
          dmarcStatus === "success"
            ? "✓ Configured"
            : "✗ Not properly configured"
        }
      </p>
      <p>
        ${
          allSuccess
            ? "All email authentication methods are properly configured! Your domain is well-protected."
            : "Please complete the setup for any missing components to fully protect your domain."
        }
      </p>
    `;
  } catch (error) {
    console.error("Error verifying all records:", error);

    resultContainer.classList.remove("hidden");
    resultContainer.innerHTML = `
      <div class="status-indicator status-error">
        <i class="fas fa-times-circle"></i> Verification Error
      </div>
      <p>An error occurred while verifying your email authentication setup. Please try again later.</p>
    `;
  } finally {
    // Reset button state
    verifyBtn.disabled = false;
    verifyBtn.innerHTML =
      '<i class="fas fa-check-circle"></i> Run Complete Verification';
  }
}

// Update summary card in final step
function updateSummaryCard(recordType, status, details) {
  const summaryCard = document.getElementById(`${recordType}-summary`);
  if (!summaryCard) return;

  const statusClass = status === "success" ? "status-success" : "status-error";
  const statusIcon = status === "success" ? "check-circle" : "times-circle";

  summaryCard.querySelector(".summary-status").innerHTML = `
    <div class="status-indicator ${statusClass}" style="display: inline-flex;">
      <i class="fas fa-${statusIcon}"></i> ${
    status === "success" ? "Configured" : "Not Configured"
  }
    </div>
    <p>${details}</p>
  `;
}

// Get recommended SPF domain based on provider
function getRecommendedSpfDomain() {
  const provider = wizardState.provider;
  if (
    !provider ||
    !providerConfig[provider] ||
    !providerConfig[provider].spf.record
  ) {
    return "";
  }

  const spfRecord = providerConfig[provider].spf.record;
  const match = spfRecord.match(/include:([^\s]+)/);
  return match ? match[1] : "";
}

// Copy to clipboard
function copyToClipboard(text, button) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      showToast("Copied to clipboard!", "success");

      // Add animation to button
      button.classList.add("copy-animation");
      setTimeout(() => {
        button.classList.remove("copy-animation");
      }, 1000);
    })
    .catch((err) => {
      console.error("Failed to copy: ", err);
      showToast("Failed to copy text", "error");
    });
}

// Finish wizard
function finishWizard() {
  // Add to history
  import("./modules/history.js").then((historyModule) => {
    historyModule.addToHistory(wizardState.domain, "auth-setup");
  });

  showToast("Setup guide completed!", "success");
}

// Apply theme preference from localStorage
function applyThemePreference() {
  const theme = localStorage.getItem("theme");
  if (theme === "dark") {
    document.body.classList.add("dark-mode");
    const icon = document.querySelector(".theme-toggle i");
    if (icon) {
      icon.classList.remove("fa-moon");
      icon.classList.add("fa-sun");
    }
  }
}

// Show first step by default when the page loads
document.addEventListener("DOMContentLoaded", function () {
  const firstStep = document.getElementById("step-1");
  if (firstStep) {
    firstStep.classList.add("active");
  }
});

document.addEventListener("DOMContentLoaded", function () {
  // Verify all step elements exist and log if any are missing
  for (let i = 1; i <= 7; i++) {
    const stepElement = document.getElementById(`step-${i}`);
    if (!stepElement) {
      console.error(`Step element with ID step-${i} is missing!`);
    }
  }

  // Make start button explicitly go to step 2
  const startButton = document.getElementById("start-wizard");
  if (startButton) {
    startButton.addEventListener(
      "click",
      function (e) {
        e.preventDefault();
        e.stopPropagation();

        // Force navigation to step 2
        const step2Element = document.getElementById("step-2");
        if (step2Element) {
          // Hide all steps
          document.querySelectorAll(".wizard-step").forEach((s) => {
            s.classList.remove("active");
          });

          // Show step 2
          step2Element.classList.add("active");

          // Update progress
          updateProgress(2);

          // Update state
          wizardState.currentStep = 2;
        } else {
          console.error("Step 2 element not found!");
        }
      },
      true
    );
  }
});
