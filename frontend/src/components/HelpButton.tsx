import React, { useState } from 'react';
import {
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  HelpOutline,
  Close,
  ExpandMore,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`help-tabpanel-${index}`}
      aria-labelledby={`help-tab-${index}`}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
};

const HelpButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Help content organized by category
  const accountingTerms = [
    {
      term: 'Account',
      definition: 'A record in the general ledger that is used to collect and store similar transactions. Examples include Cash, Accounts Receivable, and Sales.',
    },
    {
      term: 'Debit',
      definition: 'An entry on the left side of an account. For assets and expenses, debits increase the balance. For liabilities, equity, and revenue, debits decrease the balance.',
    },
    {
      term: 'Credit',
      definition: 'An entry on the right side of an account. For assets and expenses, credits decrease the balance. For liabilities, equity, and revenue, credits increase the balance.',
    },
    {
      term: 'Journal Entry',
      definition: 'A record of a business transaction showing the accounts and amounts to be debited and credited. Every journal entry must have equal debits and credits.',
    },
    {
      term: 'Ledger',
      definition: 'A collection of all accounts used by a business. The general ledger contains all accounts, while subsidiary ledgers contain details for specific account types.',
    },
    {
      term: 'Trial Balance',
      definition: 'A report listing all accounts and their balances at a specific date. The total debits should equal total credits, proving the accounting equation is in balance.',
    },
    {
      term: 'Chart of Accounts',
      definition: 'A complete listing of all accounts in the general ledger, typically organized by category (assets, liabilities, equity, revenue, expenses).',
    },
    {
      term: 'Balance Sheet',
      definition: 'A financial statement showing the financial position of a company at a specific point in time. It lists assets, liabilities, and equity (Assets = Liabilities + Equity).',
    },
    {
      term: 'Income Statement',
      definition: 'A financial statement showing revenues and expenses over a period of time. It shows whether the company made a profit or loss (Revenue - Expenses = Net Income).',
    },
    {
      term: 'Retained Earnings',
      definition: 'The cumulative net income that has been retained in the company rather than distributed to shareholders as dividends.',
    },
    {
      term: 'Adjusting Entry',
      definition: 'A journal entry made at the end of an accounting period to update account balances before financial statements are prepared.',
    },
    {
      term: 'Assets',
      definition: 'Resources owned by a company that have economic value. Examples include cash, inventory, equipment, and buildings. Assets = Liabilities + Equity.',
    },
    {
      term: 'Liabilities',
      definition: 'Obligations or debts that a company owes to others. Examples include accounts payable, loans, and mortgages.',
    },
    {
      term: 'Equity',
      definition: 'The residual interest in the assets of a company after deducting liabilities. Also called owner\'s equity or shareholders\' equity.',
    },
    {
      term: 'Revenue',
      definition: 'Income earned from selling goods or services. Also called sales or income.',
    },
    {
      term: 'Expense',
      definition: 'Costs incurred in the process of earning revenue. Examples include rent, salaries, utilities, and supplies.',
    },
    {
      term: 'Normal Side',
      definition: 'The side of an account (debit or credit) that increases its balance. Assets and expenses have a debit normal side; liabilities, equity, and revenue have a credit normal side.',
    },
    {
      term: 'Posting',
      definition: 'The process of transferring journal entry amounts to the appropriate accounts in the ledger.',
    },
    {
      term: 'Fiscal Year',
      definition: 'A 12-month period used for financial reporting. It may or may not coincide with the calendar year.',
    },
    {
      term: 'Accounting Period',
      definition: 'A specific time period for which financial statements are prepared, such as a month, quarter, or year.',
    },
  ];

  const softwareFeatures = [
    {
      title: 'User Management',
      description: 'Administrators can create, update, activate, and deactivate users. Three user roles are available: Administrator, Manager, and Accountant.',
    },
    {
      title: 'Chart of Accounts',
      description: 'Manage your company\'s accounts including adding, editing, viewing, and deactivating accounts. Search and filter capabilities help you find specific accounts quickly.',
    },
    {
      title: 'Journalizing',
      description: 'Create journal entries to record business transactions. Accountants prepare entries, and Managers approve them. All entries are tracked with before and after images in the event log.',
    },
    {
      title: 'Ledgers',
      description: 'View all transactions for a specific account. Click any account in the Chart of Accounts to see its ledger. Click the post reference (PR) to view the original journal entry.',
    },
    {
      title: 'Financial Reports',
      description: 'Generate Trial Balance, Income Statement, Balance Sheet, and Retained Earnings Statement for any date or date range. Reports can be viewed, saved, emailed, or printed.',
    },
    {
      title: 'Event Logs',
      description: 'Track all changes made to accounts with before and after images. Each event includes the user who made the change and the timestamp.',
    },
    {
      title: 'Password Security',
      description: 'Passwords must be at least 8 characters with letters, numbers, and special characters. Passwords are encrypted and expire after a set period. Users receive notifications before expiration.',
    },
    {
      title: 'User Roles',
      description: 'Administrator: Full access to create/manage users and all accounting functions. Manager: Can approve entries and view all reports. Accountant: Can create entries and view reports.',
    },
  ];

  const commonTasks = [
    {
      task: 'Creating a New Account',
      steps: [
        'Navigate to Chart of Accounts',
        'Click "Add Account" button',
        'Enter required information: account name, number, description, category, subcategory',
        'Set the normal side (debit or credit)',
        'Enter initial balance if applicable',
        'Click "Save" to create the account',
      ],
    },
    {
      task: 'Recording a Journal Entry',
      steps: [
        'Navigate to Journalize page',
        'Click "New Entry" button',
        'Enter the date of the transaction',
        'Select accounts to debit (debits must come before credits)',
        'Enter debit amounts',
        'Select accounts to credit',
        'Enter credit amounts (total debits must equal total credits)',
        'Add a description and attach source documents if needed',
        'Click "Submit" to send for approval',
      ],
    },
    {
      task: 'Approving a Journal Entry (Manager)',
      steps: [
        'Navigate to Journalize page',
        'Click on "Pending Approvals" tab',
        'Review the journal entry details',
        'Verify debits equal credits',
        'Check attached source documents',
        'Click "Approve" to post or "Reject" with a comment explaining why',
      ],
    },
    {
      task: 'Viewing Account Ledger',
      steps: [
        'Navigate to Chart of Accounts',
        'Find the account you want to view',
        'Click on the account name or number',
        'The ledger will display all transactions for that account',
        'Use filters to narrow by date range',
        'Click on any PR (post reference) to see the original journal entry',
      ],
    },
    {
      task: 'Generating Financial Reports',
      steps: [
        'Navigate to Reports menu in the header',
        'Select the report type (Trial Balance, Income Statement, etc.)',
        'Choose a specific date or date range',
        'Click "Generate Report"',
        'Use the toolbar to save, email, or print the report',
      ],
    },
    {
      task: 'Resetting Your Password',
      steps: [
        'Click "Forgot Password" on the login page',
        'Enter your email address and user ID',
        'Answer security questions',
        'Enter your new password (must meet requirements)',
        'Confirm your new password',
        'Click "Submit" to complete the reset',
      ],
    },
  ];

  const troubleshooting = [
    {
      issue: 'Journal Entry Won\'t Submit',
      solution: 'Ensure total debits equal total credits. Check that all required fields are completed and all amounts are valid numbers with two decimal places.',
    },
    {
      issue: 'Can\'t Deactivate Account',
      solution: 'Accounts with a balance greater than zero cannot be deactivated. You must first adjust the account balance to zero through journal entries.',
    },
    {
      issue: 'Duplicate Account Error',
      solution: 'Each account must have a unique account number and name. Check the Chart of Accounts to see if the account already exists.',
    },
    {
      issue: 'Password Doesn\'t Meet Requirements',
      solution: 'Password must be at least 8 characters, start with a letter, and contain at least one letter, one number, and one special character.',
    },
    {
      issue: 'Can\'t Login After 3 Failed Attempts',
      solution: 'Your account has been suspended. Contact an administrator to reactivate your account.',
    },
    {
      issue: 'Ledger Balance Doesn\'t Match Expected',
      solution: 'Check all posted journal entries for the account. Verify that debits increase assets/expenses and credits increase liabilities/equity/revenue.',
    },
  ];

  return (
    <>
      {/* Floating Help Button */}
      <Fab
        color="primary"
        aria-label="help"
        onClick={handleOpen}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000,
          boxShadow: '0 4px 20px rgba(25, 118, 210, 0.4)',
          '&:hover': {
            transform: 'scale(1.1)',
            boxShadow: '0 6px 25px rgba(25, 118, 210, 0.5)',
          },
          transition: 'all 0.3s ease-in-out',
        }}
        title="Help & Documentation"
      >
        <HelpOutline sx={{ fontSize: 32 }} />
      </Fab>

      {/* Help Dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          pb: 2,
        }}>
          <Box>
            <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
              FinKen 2.0 Help Center
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              Your comprehensive guide to accounting software
            </Typography>
          </Box>
          <Button
            onClick={handleClose}
            sx={{ 
              minWidth: 'auto',
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <Close />
          </Button>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 'medium',
                },
              }}
            >
              <Tab label="Accounting Terms" />
              <Tab label="Software Features" />
              <Tab label="How-To Guides" />
              <Tab label="Troubleshooting" />
            </Tabs>
          </Box>

          {/* Tab Content */}
          <Box sx={{ maxHeight: 'calc(90vh - 250px)', overflow: 'auto' }}>
            {/* Accounting Terms Tab */}
            <TabPanel value={tabValue} index={0}>
              <Typography variant="h6" gutterBottom>
                Common Accounting Terms
              </Typography>
              <List>
                {accountingTerms.map((item, index) => (
                  <React.Fragment key={index}>
                    <ListItem alignItems="flex-start" sx={{ flexDirection: 'column', py: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {item.term}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {item.definition}
                      </Typography>
                    </ListItem>
                    {index < accountingTerms.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </TabPanel>

            {/* Software Features Tab */}
            <TabPanel value={tabValue} index={1}>
              <Typography variant="h6" gutterBottom>
                Key Software Features
              </Typography>
              <List>
                {softwareFeatures.map((feature, index) => (
                  <React.Fragment key={index}>
                    <ListItem alignItems="flex-start" sx={{ flexDirection: 'column', py: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {feature.description}
                      </Typography>
                    </ListItem>
                    {index < softwareFeatures.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </TabPanel>

            {/* How-To Guides Tab */}
            <TabPanel value={tabValue} index={2}>
              <Typography variant="h6" gutterBottom>
                Step-by-Step Guides
              </Typography>
              {commonTasks.map((guide, index) => (
                <Accordion key={index} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                      {guide.task}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {guide.steps.map((step: string, stepIndex: number) => (
                        <ListItem key={stepIndex}>
                          <ListItemText
                            primary={`${stepIndex + 1}. ${step}`}
                            primaryTypographyProps={{
                              variant: 'body2',
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))}
            </TabPanel>

            {/* Troubleshooting Tab */}
            <TabPanel value={tabValue} index={3}>
              <Typography variant="h6" gutterBottom>
                Common Issues & Solutions
              </Typography>
              <List>
                {troubleshooting.map((item, index) => (
                  <React.Fragment key={index}>
                    <ListItem alignItems="flex-start" sx={{ flexDirection: 'column', py: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                        ⚠️ {item.issue}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        <strong>Solution:</strong> {item.solution}
                      </Typography>
                    </ListItem>
                    {index < troubleshooting.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </TabPanel>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button onClick={handleClose} variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default HelpButton;
