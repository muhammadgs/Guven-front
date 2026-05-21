// raport/reportTypes.js
// Type-safe strukturlar (JSDoc ilə)

/**
 * @typedef {Object} DateRange
 * @property {Date} start
 * @property {Date} end
 */

/**
 * @typedef {Object} ReportFilters
 * @property {number|null} company_id
 * @property {number|null} department_id
 * @property {number|null} employee_id
 * @property {string|null} status
 * @property {string|null} priority
 * @property {string|null} payment_status
 * @property {number|null} partner_company_id
 * @property {boolean} show_partner_tasks
 * @property {number} limit
 * @property {number} offset
 */

/**
 * @typedef {Object} Task
 * @property {number} id
 * @property {string} task_code
 * @property {string} task_title
 * @property {string} status
 * @property {string} priority
 * @property {string} created_at
 * @property {string|null} completed_date
 * @property {string|null} due_date
 * @property {number} company_id
 * @property {string} company_name
 * @property {number|null} department_id
 * @property {string|null} department_name
 * @property {number|null} assigned_to
 * @property {string|null} assignee_name
 * @property {number|null} work_type_id
 * @property {string|null} work_type_name
 * @property {boolean} is_billable
 * @property {number} billing_rate
 * @property {number} actual_hours
 * @property {number} estimated_hours
 * @property {number} progress_percentage
 * @property {string|null} task_description
 * @property {string|null} creator_name
 */

/**
 * @typedef {Object} Company
 * @property {number} id
 * @property {string} company_name
 * @property {string} company_code
 * @property {string|null} voen
 * @property {string|null} address
 * @property {string|null} company_website
 * @property {boolean} is_active
 * @property {string|null} registration_date
 * @property {string|null} relationship_type
 */

/**
 * @typedef {Object} Department
 * @property {number} id
 * @property {string} name
 * @property {string} code
 * @property {string|null} description
 * @property {boolean} is_active
 */

/**
 * @typedef {Object} Employee
 * @property {number} id
 * @property {string} name
 * @property {string|null} surname
 * @property {string|null} father_name
 * @property {string|null} position
 * @property {string|null} email
 * @property {string|null} phone
 * @property {string} company_code
 * @property {number} company_id
 * @property {number|null} department_id
 * @property {string|null} department_name
 * @property {string} user_type
 * @property {boolean} is_admin
 * @property {boolean} is_super_admin
 * @property {string|null} profile_image_url
 */

/**
 * @typedef {Object} WorkType
 * @property {number} id
 * @property {string} name
 * @property {string} code
 * @property {number} hourly_rate
 * @property {boolean} is_billable
 * @property {string|null} description
 * @property {string|null} color_code
 */

/**
 * @typedef {Object} Partner
 * @property {number} id
 * @property {string} requester_company_code
 * @property {string} target_company_code
 * @property {string} relationship_type
 * @property {string} status
 * @property {string|null} contact_person
 * @property {string|null} contact_phone
 * @property {string|null} contact_email
 * @property {string|null} partner_company_name
 */

/**
 * @typedef {Object} CompanyRelationship
 * @property {number} id
 * @property {string} parent_company_code
 * @property {string} child_company_code
 * @property {string} relationship_type
 * @property {string} status
 * @property {string|null} parent_company_name
 * @property {string|null} child_company_name
 */

/**
 * @typedef {Object} PartnerTask
 * @property {number} id
 * @property {string} task_code
 * @property {string} task_title
 * @property {string} status
 * @property {string} priority
 * @property {string} created_at
 * @property {string|null} due_date
 * @property {string|null} partner_company_name
 * @property {string} payment_status
 * @property {number|null} estimated_cost
 * @property {number|null} actual_cost
 */

/**
 * @typedef {Object} ArchiveTask
 * @property {number} id
 * @property {string} task_title
 * @property {string} status
 * @property {string} created_at
 * @property {string} archived_at
 * @property {string|null} archive_reason
 * @property {string} company_name
 */

/**
 * @typedef {Object} FinancialStats
 * @property {number} total_revenue
 * @property {number} total_cost
 * @property {number} total_profit
 * @property {number} profit_margin
 * @property {number} completed_tasks
 */

/**
 * @typedef {Object} GeneralStats
 * @property {number} total_tasks
 * @property {number} completed_tasks
 * @property {number} pending_tasks
 * @property {number} in_progress_tasks
 * @property {number} overdue_tasks
 * @property {number} active_employees
 * @property {number} active_companies
 */

/**
 * @typedef {Object} MonthlyTrend
 * @property {number} month
 * @property {number} completed_tasks
 * @property {number} pending_tasks
 * @property {number} overdue_tasks
 * @property {number} total_tasks
 */

/**
 * @typedef {Object} FullReportResponse
 * @property {boolean} success
 * @property {Object} data
 * @property {Task[]} data.detailed_tasks
 * @property {Company[]} data.companies
 * @property {Department[]} data.departments
 * @property {Employee[]} data.employees
 * @property {WorkType[]} data.work_types
 * @property {Partner[]} data.partners
 * @property {CompanyRelationship[]} data.company_relationships
 * @property {PartnerTask[]} data.partner_tasks
 * @property {ArchiveTask[]} data.archive_tasks
 * @property {FinancialStats} data.financial
 * @property {GeneralStats} data.general
 * @property {Task[]} data.recent_tasks
 * @property {MonthlyTrend[]} data.monthly_trend
 */

/**
 * @typedef {Object} EmployeeReportResponse
 * @property {boolean} success
 * @property {Object} data
 * @property {Employee} data.employee
 * @property {Task[]} data.tasks
 * @property {Object} data.performance
 * @property {number} data.performance.total_tasks
 * @property {number} data.performance.completed_tasks
 * @property {number} data.performance.pending_tasks
 * @property {number} data.performance.in_progress_tasks
 * @property {number} data.performance.overdue_tasks
 * @property {number} data.performance.rejected_tasks
 * @property {number} data.performance.waiting_approval_tasks
 * @property {number} data.performance.completion_rate
 * @property {number} data.performance.avg_completion_days
 * @property {number} data.performance.on_time_rate
 * @property {number} data.performance.created_by_user
 */

/**
 * @typedef {Object} CompanyReportResponse
 * @property {boolean} success
 * @property {Object} data
 * @property {Company} data.company
 * @property {Task[]} data.tasks
 * @property {Employee[]} data.employees
 * @property {Object} data.summary
 */

window.ReportTypes = {
    // Types are defined via JSDoc, this object exists for module exports
};