import React, { useState } from 'react';
import { 
  BuildingOfficeIcon, 
  UserIcon, 
  EnvelopeIcon, 
  LockClosedIcon,
  PhoneIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';

interface RegistrationData {
  tenantName: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerFirstName: string;
  ownerLastName: string;
  subdomain: string;
  plan: string;
  industry: string;
  companySize: string;
  phone: string;
  website: string;
}

interface OnboardingResponse {
  tenant: {
    id: string;
    name: string;
    subdomain: string;
    plan: string;
    status: string;
  };
  owner: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  credentials: {
    apiKey: string;
    adminUrl: string;
    loginEmail: string;
  };
  nextSteps: string[];
}

const TenantRegistration: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<OnboardingResponse | null>(null);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);

  const [formData, setFormData] = useState<RegistrationData>({
    tenantName: '',
    ownerEmail: '',
    ownerPassword: '',
    ownerFirstName: '',
    ownerLastName: '',
    subdomain: '',
    plan: 'starter',
    industry: '',
    companySize: '',
    phone: '',
    website: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);

    // Auto-generate subdomain from tenant name
    if (name === 'tenantName' && !formData.subdomain) {
      const autoSubdomain = value.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20);
      setFormData(prev => ({ ...prev, subdomain: autoSubdomain }));
    }
  };

  const checkSubdomainAvailability = async (subdomain: string) => {
    if (!subdomain || subdomain.length < 3) {
      setSubdomainAvailable(null);
      return;
    }

    setCheckingSubdomain(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://65.181.118.38:5001/api'}/onboarding/check-availability/${subdomain}`);
      const data = await response.json();
      setSubdomainAvailable(data.available);
    } catch (error) {
      console.error('Error checking subdomain:', error);
      setSubdomainAvailable(null);
    } finally {
      setCheckingSubdomain(false);
    }
  };

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData(prev => ({ ...prev, subdomain: value }));
    
    // Debounce subdomain check
    setTimeout(() => checkSubdomainAvailability(value), 500);
  };

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        return !!(formData.tenantName && formData.subdomain && subdomainAvailable);
      case 2:
        return !!(formData.ownerFirstName && formData.ownerLastName && formData.ownerEmail && formData.ownerPassword);
      case 3:
        return true; // Optional step
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://65.181.118.38:5001/api'}/onboarding/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess(data.data);
      setStep(5); // Success step

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <BuildingOfficeIcon className="mx-auto h-12 w-12 text-blue-600" />
        <h2 className="mt-4 text-2xl font-bold text-gray-900">Create Your Blog</h2>
        <p className="mt-2 text-gray-600">Let's start with your blog information</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Blog Name *
          </label>
          <input
            type="text"
            name="tenantName"
            value={formData.tenantName}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="My Awesome Blog"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subdomain *
          </label>
          <div className="flex">
            <input
              type="text"
              name="subdomain"
              value={formData.subdomain}
              onChange={handleSubdomainChange}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="myawesomeblog"
              required
            />
            <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md text-gray-600">
              .faceblog.com
            </span>
          </div>
          {checkingSubdomain && (
            <p className="mt-1 text-sm text-gray-500">Checking availability...</p>
          )}
          {subdomainAvailable === true && (
            <p className="mt-1 text-sm text-green-600 flex items-center">
              <CheckCircleIcon className="h-4 w-4 mr-1" />
              Available!
            </p>
          )}
          {subdomainAvailable === false && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
              Not available
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Plan
          </label>
          <select
            name="plan"
            value={formData.plan}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="starter">Starter (Free)</option>
            <option value="pro">Pro ($29/month)</option>
            <option value="enterprise">Enterprise ($99/month)</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <UserIcon className="mx-auto h-12 w-12 text-blue-600" />
        <h2 className="mt-4 text-2xl font-bold text-gray-900">Admin Account</h2>
        <p className="mt-2 text-gray-600">Create your admin account</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            First Name *
          </label>
          <input
            type="text"
            name="ownerFirstName"
            value={formData.ownerFirstName}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Last Name *
          </label>
          <input
            type="text"
            name="ownerLastName"
            value={formData.ownerLastName}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Address *
        </label>
        <input
          type="email"
          name="ownerEmail"
          value={formData.ownerEmail}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Password *
        </label>
        <input
          type="password"
          name="ownerPassword"
          value={formData.ownerPassword}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          minLength={8}
          required
        />
        <p className="mt-1 text-sm text-gray-500">Minimum 8 characters</p>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <GlobeAltIcon className="mx-auto h-12 w-12 text-blue-600" />
        <h2 className="mt-4 text-2xl font-bold text-gray-900">Additional Info</h2>
        <p className="mt-2 text-gray-600">Help us customize your experience (optional)</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Industry
          </label>
          <select
            name="industry"
            value={formData.industry}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select an industry</option>
            <option value="technology">Technology</option>
            <option value="healthcare">Healthcare</option>
            <option value="finance">Finance</option>
            <option value="education">Education</option>
            <option value="retail">Retail</option>
            <option value="media">Media & Entertainment</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Size
          </label>
          <select
            name="companySize"
            value={formData.companySize}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select company size</option>
            <option value="1">Just me</option>
            <option value="2-10">2-10 employees</option>
            <option value="11-50">11-50 employees</option>
            <option value="51-200">51-200 employees</option>
            <option value="200+">200+ employees</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Website
          </label>
          <input
            type="url"
            name="website"
            value={formData.website}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com"
          />
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircleIcon className="mx-auto h-12 w-12 text-blue-600" />
        <h2 className="mt-4 text-2xl font-bold text-gray-900">Review & Confirm</h2>
        <p className="mt-2 text-gray-600">Please review your information</p>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg space-y-4">
        <div>
          <h3 className="font-medium text-gray-900">Blog Information</h3>
          <p className="text-gray-600">Name: {formData.tenantName}</p>
          <p className="text-gray-600">URL: {formData.subdomain}.faceblog.com</p>
          <p className="text-gray-600">Plan: {formData.plan}</p>
        </div>

        <div>
          <h3 className="font-medium text-gray-900">Admin Account</h3>
          <p className="text-gray-600">Name: {formData.ownerFirstName} {formData.ownerLastName}</p>
          <p className="text-gray-600">Email: {formData.ownerEmail}</p>
        </div>

        {(formData.industry || formData.companySize) && (
          <div>
            <h3 className="font-medium text-gray-900">Additional Info</h3>
            {formData.industry && <p className="text-gray-600">Industry: {formData.industry}</p>}
            {formData.companySize && <p className="text-gray-600">Company Size: {formData.companySize}</p>}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircleIcon className="mx-auto h-12 w-12 text-green-600" />
        <h2 className="mt-4 text-2xl font-bold text-gray-900">Welcome to FaceBlog! 🎉</h2>
        <p className="mt-2 text-gray-600">Your blog has been created successfully</p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
          <div>
            <h3 className="font-medium text-gray-900">Your Blog Details</h3>
            <p className="text-gray-600">Name: {success.tenant.name}</p>
            <p className="text-gray-600">URL: {success.tenant.subdomain}.faceblog.com</p>
            <p className="text-gray-600">Plan: {success.tenant.plan}</p>
          </div>

          <div>
            <h3 className="font-medium text-gray-900">Admin Access</h3>
            <p className="text-gray-600">Email: {success.owner.email}</p>
            <p className="text-gray-600">Role: {success.owner.role}</p>
          </div>

          <div>
            <h3 className="font-medium text-gray-900">API Key</h3>
            <div className="bg-gray-100 p-3 rounded font-mono text-sm break-all">
              {success.credentials.apiKey}
            </div>
            <p className="text-xs text-gray-500 mt-1">Save this API key securely - you won't see it again!</p>
          </div>

          <div>
            <h3 className="font-medium text-gray-900">Next Steps</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              {success.nextSteps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ul>
          </div>

          <div className="pt-4">
            <a
              href={success.credentials.adminUrl}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors inline-block text-center"
            >
              Go to Admin Panel
            </a>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Progress indicator */}
          {step < 5 && (
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {[1, 2, 3, 4].map((stepNumber) => (
                  <div
                    key={stepNumber}
                    className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      step >= stepNumber
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {stepNumber}
                  </div>
                ))}
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(step / 4) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}

            {step < 5 && (
              <div className="mt-8 flex justify-between">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!validateStep(step)}
                    className={`ml-auto px-4 py-2 rounded-md ${
                      validateStep(step)
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className={`ml-auto px-6 py-2 rounded-md ${
                      loading
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {loading ? 'Creating...' : 'Create Blog'}
                  </button>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default TenantRegistration;
