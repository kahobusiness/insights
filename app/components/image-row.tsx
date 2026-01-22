import styles from './image-row.module.css'

interface ImageRowProps {
    children: React.ReactNode
}

export function ImageRow({ children }: ImageRowProps) {
    return <div className={styles.imageRow}>{children}</div>
}
