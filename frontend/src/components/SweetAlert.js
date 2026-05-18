import Swal from 'sweetalert2'

export const showConfirm = async (title, text, confirmText = 'Delete', cancelText = 'Cancel') => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#00f5d4',
    cancelButtonColor: '#ff3355',
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    background: '#0e0e18',
    color: '#e8e8f0',
    iconColor: '#ffd60a',
    borderRadius: '14px',
    padding: '24px',
  })
  return result.isConfirmed
}

export const showSuccess = (title, text) => {
  Swal.fire({
    icon: 'success',
    title,
    text,
    timer: 2000,
    showConfirmButton: false,
    background: '#0e0e18',
    color: '#e8e8f0',
    iconColor: '#00f593',
    borderRadius: '14px',
    padding: '24px',
  })
}

export const showError = (title, text) => {
  Swal.fire({
    icon: 'error',
    title,
    text,
    background: '#0e0e18',
    color: '#e8e8f0',
    iconColor: '#ff3355',
    borderRadius: '14px',
    padding: '24px',
    confirmButtonColor: '#00f5d4',
  })
}
