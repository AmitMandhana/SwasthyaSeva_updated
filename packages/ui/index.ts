export { Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";

export { Modal } from "./Modal";
export type { ModalProps } from "./Modal";

export { Card } from "./Card";
export type { CardProps } from "./Card";

export { Input } from "./Input";
export type { InputProps } from "./Input";

export { TextField } from "./TextField";
export type { TextFieldProps } from "./TextField";

export { SelectField } from "./SelectField";
export type { SelectFieldProps, SelectOption } from "./SelectField";

export { TextAreaField } from "./TextAreaField";
export type { TextAreaFieldProps } from "./TextAreaField";

export { ImageUpload } from "./ImageUpload";
export type { ImageUploadProps } from "./ImageUpload";

export { DataTable } from "./DataTable";
export type { DataTableProps, Column } from "./DataTable";

export { Checkbox } from "./Checkbox";
export type { CheckboxProps } from "./Checkbox";

export { OTPInput } from "./OTPInput";
export type { OTPInputProps } from "./OTPInput";

export { ToggleSwitch } from "./ToggleSwitch";
export type { ToggleSwitchProps } from "./ToggleSwitch";

export { CollapsibleSection } from "./CollapsibleSection";
export type { CollapsibleSectionProps } from "./CollapsibleSection";

export { Badge } from "./Badge";
export type { BadgeProps, BadgeVariant } from "./Badge";

export { ThemeProvider, useTheme } from "./ThemeProvider";
export { themes, defaultTheme } from "./themes";
export type { Theme, ResolvedTheme } from "./themes";

export { Navbar } from "./Navbar";
export type { NavbarProps, NavItem } from "./Navbar";

export { AuthProvider, useAuth } from "./AuthProvider";

export { AnalyticsProvider, useAnalytics } from "./AnalyticsProvider";

export { ToastProvider, useToast } from "./Toast";

export { ConfirmModal } from "./ConfirmModal";
export type { ConfirmModalProps, ConfirmVariant } from "./ConfirmModal";

export { FilterSearchBar } from "./FilterSearchBar";
export type { FilterDef, ParsedFilters, FilterSearchBarProps } from "./FilterSearchBar";

export { ListToolbar } from "./ListToolbar";
export type { ListToolbarProps } from "./ListToolbar";

export { CopyablePassword } from "./CopyablePassword";

export { TempPasswordReveal } from "./TempPasswordReveal";
export type { TempPasswordRevealProps } from "./TempPasswordReveal";

export { ErrorBanner } from "./ErrorBanner";

export { SegmentedControl } from "./SegmentedControl";

export { BannerUpload } from "./BannerUpload";
export type { BannerUploadProps } from "./BannerUpload";

export { AvatarUpload } from "./AvatarUpload";
export type { AvatarUploadProps } from "./AvatarUpload";
export type { SegmentedControlProps, SegmentedControlOption } from "./SegmentedControl";
export type { ErrorBannerProps } from "./ErrorBanner";
export type { CopyablePasswordProps } from "./CopyablePassword";

export { ChangePasswordForm } from "./ChangePasswordForm";
export type { ChangePasswordFormProps } from "./ChangePasswordForm";

export { TagMultiSelect } from "./TagMultiSelect";
export type { TagMultiSelectProps, TagOption } from "./TagMultiSelect";

export { TabPillMultiSelect } from "./TabPillMultiSelect";
export type { TabPillMultiSelectProps, TabPillOption } from "./TabPillMultiSelect";

export { Popover } from "./Popover";
export type { PopoverProps } from "./Popover";

export { Mascot } from "./Mascot";
export { HealthIllustration } from "./HealthIllustration";

export { CatMascot } from "./CatMascot";
export type { CatMascotProps } from "./CatMascot";

export { PrescriptionPrint } from "./PrescriptionPrint";
export type { PrescriptionPrintData } from "./PrescriptionPrint";

export {
  validateUsername, validateName, validatePhone, validateEmail, validatePassword,
  validateDob, validateGender, validateCity, validateState, validateCountry,
  validateStreetAddress, validatePincode, validateLicenseNo, validateBio, validateCode,
  validateLocationX, validateLocationY, validateUrl, validateClinicName,
  validatePositiveInteger, validateSlotFee, validateSlotTime, validateSlotDay,
  validatePrescriptionFormat, validateForm,
  createDoctorSchema, updateDoctorSchema, createClinicSchema, updateClinicSchema,
  createClinicManagerSchema, updateClinicManagerSchema, createSlotSchema, updateSlotSchema,
  createUserSchema, adminLoginSchema, passwordChangeSchema,
  VALID_STATES,
} from "./validators";
export type { FieldDef, FormSchema, FieldErrors } from "./validators";

export { useFormValidation } from "./useFormValidation";

export { usePagination } from "./usePagination";
export type { UsePaginationReturn } from "./usePagination";

export { PaginationBar } from "./PaginationBar";
export type { PaginationBarProps } from "./PaginationBar";

export { usePhotoUpload } from "./usePhotoUpload";
export type { CloudinarySignature, UsePhotoUploadOptions, UsePhotoUploadReturn } from "./usePhotoUpload";

export { PhotoPreviewModal } from "./PhotoPreviewModal";
export type { PhotoPreviewModalProps } from "./PhotoPreviewModal";

export { createAuthStore } from "./createAuthStore";

export { createApiClient } from "./createApiClient";

export { TabBar } from "./TabBar";
export type { TabBarProps, TabItem } from "./TabBar";
export type { ApiClientConfig } from "./createApiClient";

export { uploadToCloudinary } from "./uploadToCloudinary";
export type { CloudinarySignatureResponse } from "./uploadToCloudinary";

export { useUsernameAvailability } from "./useUsernameAvailability";
export type { UsernameStatus, UseUsernameAvailabilityOptions, UseUsernameAvailabilityReturn } from "./useUsernameAvailability";

export {
  formatSlotTime, SLOT_TIME_OPTIONS_24H, SLOT_TIME_OPTIONS_12H, SLOT_TIME_MAP_12H,
  DAY_ORDER, DAY_LABELS, DAY_SHORT_LABELS, DAY_SELECT_OPTIONS,
} from "./slotUtils";
